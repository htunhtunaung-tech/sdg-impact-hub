"use server";

import { db } from "@/lib/db";
import { ActionError, runAction, type ActionResult } from "@/lib/action";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";

/** Follow or unfollow another member (like Instagram). Notifies them once a day at most per follower. */
export async function toggleFollowUserAction(targetId: string): Promise<ActionResult<{ following: boolean }>> {
  return runAction(async () => {
    const me = await requireActionUser();
    if (typeof targetId !== "string" || !targetId) throw new ActionError("Invalid member.");
    if (targetId === me.id) throw new ActionError("You can't follow yourself.");
    await enforceRateLimit("follow", 120, 3600, me.id);

    const target = await db.user.findUnique({ where: { id: targetId }, include: { profile: { select: { username: true, isPublic: true } } } });
    if (!target || target.status !== "ACTIVE" || !target.profile) throw new ActionError("This member can't be followed.");

    const key = { followerId_followingId: { followerId: me.id, followingId: targetId } };
    const existing = await db.userFollow.findUnique({ where: key });
    if (existing) {
      await db.userFollow.delete({ where: key });
    } else {
      await db.userFollow.create({ data: { followerId: me.id, followingId: targetId } });
      const mine = await db.userProfile.findUnique({ where: { userId: me.id }, select: { username: true } });
      const link = mine ? `/u/${mine.username}` : undefined;
      // Following, unfollowing and following again shouldn't spam them.
      const recent = await db.notification.findFirst({
        where: { userId: targetId, type: "NEW_FOLLOWER", link, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      });
      if (!recent) {
        const back = await db.userFollow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: me.id } } });
        await notify(targetId, {
          type: "NEW_FOLLOWER",
          title: `${me.name ?? "Someone"} started following you`,
          body: back ? "You follow each other now." : "Follow them back to see their impact in your feed.",
          link,
        });
      }
    }
    // No revalidatePath: it would re-render the page you are on and re-shuffle lists like People.
    // Profile pages are dynamic, and the button refreshes them itself when counts should change.
    return { ok: true, data: { following: !existing }, message: existing ? `Unfollowed ${target.name}.` : `You're following ${target.name}.` };
  });
}
