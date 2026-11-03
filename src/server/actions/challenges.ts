"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, runAction, type ActionResult } from "@/lib/action";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { challengeXpToday, evaluateAchievements, periodKeyFor, touchStreak, XP } from "@/lib/gamification";

/**
 * Completing a challenge:
 *  - honour-system challenges: small XP, once per period, capped per day;
 *  - evidence challenges: create a self-reported impact entry; XP only once it's verified.
 */
export async function completeChallengeAction(challengeId: string, input: { note?: string; evidenceUrl?: string; value?: number }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("challenge", 20, 3600, user.id);
    const c = await db.challenge.findUnique({ where: { id: challengeId }, include: { metric: true } });
    const now = new Date();
    if (!c || !c.isActive || c.startsAt > now || c.endsAt < now) throw new ActionError("This challenge isn't running right now.");
    const periodKey = periodKeyFor(c.frequency, now);
    const existing = await db.challengeParticipation.findUnique({ where: { challengeId_userId_periodKey: { challengeId, userId: user.id, periodKey } } });
    if (existing?.status === "COMPLETED") throw new ActionError(c.frequency === "ONE_TIME" ? "You've already completed this challenge." : `Already done ${c.frequency === "DAILY" ? "today" : "this week"} — come back later!`);
    const note = input.note?.trim().slice(0, 500) || null;
    const evidence = typeof input.evidenceUrl === "string" && input.evidenceUrl.startsWith("/api/files/evidence/") ? input.evidenceUrl : null;

    if (c.requiresEvidence) {
      if (!evidence) throw new ActionError("Add a photo as evidence for this challenge.");
      const value = Number(input.value);
      await db.impactSubmission.create({
        data: {
          userId: user.id, goalId: c.goalId, title: `Challenge: ${c.title}`, description: note, date: now, hours: 0.5, evidenceUrl: evidence,
          values: c.metricId && Number.isFinite(value) && value > 0 && value < 10000 ? { create: { metricId: c.metricId, value } } : undefined,
        },
      });
      await db.challengeParticipation.upsert({
        where: { challengeId_userId_periodKey: { challengeId, userId: user.id, periodKey } },
        create: { challengeId, userId: user.id, periodKey, status: "COMPLETED", completedAt: now, note, xpAwarded: 0 },
        update: { status: "COMPLETED", completedAt: now, note },
      });
      revalidatePath("/challenges");
      return { ok: true, message: "Submitted! XP is awarded once a reviewer verifies your evidence." };
    }

    const remaining = Math.max(XP.dailyChallengeCap - (await challengeXpToday(user.id)), 0);
    const xp = Math.min(c.xpReward, remaining);
    await db.challengeParticipation.upsert({
      where: { challengeId_userId_periodKey: { challengeId, userId: user.id, periodKey } },
      create: { challengeId, userId: user.id, periodKey, status: "COMPLETED", completedAt: now, note, xpAwarded: xp },
      update: { status: "COMPLETED", completedAt: now, note, xpAwarded: xp },
    });
    if (xp) await db.user.update({ where: { id: user.id }, data: { xp: { increment: xp } } });
    await touchStreak(user.id, now);
    await db.activity.create({ data: { actorId: user.id, type: "COMPLETED_CHALLENGE", message: `completed “${c.title}”` } });
    await evaluateAchievements(user.id);
    revalidatePath("/challenges");
    return { ok: true, message: xp ? `Nice work! +${xp} XP` : "Nice work! You've reached today's challenge XP limit, but it still counts for your streak." };
  });
}
