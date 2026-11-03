"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { isAdmin } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { commentSchema, groupSchema, messageSchema, postSchema, reportSchema } from "@/lib/validation";
import { randomSuffix, slugify } from "@/lib/utils";

const REACTIONS = ["LIKE", "CELEBRATE", "SUPPORT", "INSIGHTFUL"] as const;

export async function createPostAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("post", 10, 600, user.id);
    const d = parseOrThrow(postSchema, input);
    if (d.groupId) {
      const member = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: d.groupId, userId: user.id } } });
      if (!member) throw new ActionError("Join the group to post in it.");
    }
    await db.post.create({
      data: {
        authorId: user.id, type: d.type, title: d.title, body: d.body, goalId: d.goalId ?? null, groupId: d.groupId,
        eventStartsAt: d.type === "EVENT" ? d.eventStartsAt : null, eventLocation: d.type === "EVENT" ? d.eventLocation : null,
      },
    });
    revalidatePath("/community", "layout");
    return { ok: true, message: d.type === "EVENT" ? "Event announced." : "Posted." };
  });
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const p = await db.post.findUnique({ where: { id: postId } });
    if (!p) throw new ActionError("Post not found.");
    if (p.authorId !== user.id && !isAdmin(user)) throw new ActionError("You can only delete your own posts.");
    await db.post.delete({ where: { id: postId } });
    revalidatePath("/community", "layout");
    return { ok: true, message: "Post deleted." };
  });
}

export async function toggleReactionAction(postId: string, type: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("react", 120, 600, user.id);
    if (!REACTIONS.includes(type as never)) throw new ActionError("Invalid reaction.");
    const key = { postId_userId: { postId, userId: user.id } };
    const existing = await db.reaction.findUnique({ where: key });
    if (existing?.type === type) await db.reaction.delete({ where: key });
    else if (existing) await db.reaction.update({ where: key, data: { type: type as (typeof REACTIONS)[number] } });
    else {
      const post = await db.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) throw new ActionError("Post not found.");
      await db.reaction.create({ data: { postId, userId: user.id, type: type as (typeof REACTIONS)[number] } });
    }
    return { ok: true };
  });
}

export async function addCommentAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("comment", 20, 600, user.id);
    const d = parseOrThrow(commentSchema, input);
    const post = await db.post.findUnique({ where: { id: d.postId }, select: { authorId: true, isHidden: true, title: true } });
    if (!post || post.isHidden) throw new ActionError("Post not found.");
    await db.comment.create({ data: { postId: d.postId, authorId: user.id, body: d.body } });
    if (post.authorId !== user.id)
      await notify(post.authorId, { type: "COMMENT", title: `${user.name} commented on your post`, body: d.body.slice(0, 140), link: `/community/post/${d.postId}` });
    revalidatePath(`/community/post/${d.postId}`);
    return { ok: true };
  });
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const c = await db.comment.findUnique({ where: { id: commentId } });
    if (!c) throw new ActionError("Comment not found.");
    if (c.authorId !== user.id && !isAdmin(user)) throw new ActionError("You can only delete your own comments.");
    await db.comment.delete({ where: { id: commentId } });
    return { ok: true, message: "Comment deleted." };
  });
}

export async function reportAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("report", 10, 3600, user.id);
    const d = parseOrThrow(reportSchema, input);
    const dupe = await db.report.findFirst({ where: { reporterId: user.id, targetType: d.targetType, targetId: d.targetId, status: "OPEN" } });
    if (dupe) return { ok: true, message: "You've already reported this. Our moderators will review it." };
    await db.report.create({ data: { reporterId: user.id, targetType: d.targetType, targetId: d.targetId, reason: d.reason, details: d.details } });
    return { ok: true, message: "Thanks — our moderators will review this." };
  });
}

export async function toggleGroupMembershipAction(groupId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const key = { groupId_userId: { groupId, userId: user.id } };
    const existing = await db.groupMember.findUnique({ where: key });
    if (existing) await db.groupMember.delete({ where: key });
    else {
      if (!(await db.discussionGroup.count({ where: { id: groupId } }))) throw new ActionError("Group not found.");
      await db.groupMember.create({ data: { groupId, userId: user.id } });
    }
    revalidatePath("/community", "layout");
    return { ok: true, message: existing ? "You left the group." : "Welcome to the group!" };
  });
}

export async function createGroupAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("group", 3, 3600, user.id);
    const d = parseOrThrow(groupSchema, input);
    const base = slugify(d.name) || "group";
    const slug = (await db.discussionGroup.findUnique({ where: { slug: base } })) ? `${base}-${randomSuffix(4)}` : base;
    await db.discussionGroup.create({
      data: { name: d.name, description: d.description, goalId: d.goalId ?? null, slug, createdById: user.id, members: { create: { userId: user.id } } },
    });
    revalidatePath("/community", "layout");
    return { ok: true, data: { slug }, message: "Group created." };
  });
}

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("message", 30, 600, user.id);
    const d = parseOrThrow(messageSchema, input);
    if (d.recipientId === user.id) throw new ActionError("You can't message yourself.");
    const recipient = await db.user.findUnique({ where: { id: d.recipientId }, select: { id: true, status: true } });
    if (!recipient || recipient.status !== "ACTIVE") throw new ActionError("This person can't receive messages.");
    await db.message.create({ data: { senderId: user.id, recipientId: d.recipientId, body: d.body } });
    // One unread notification per conversation is enough.
    const unread = await db.notification.findFirst({ where: { userId: d.recipientId, type: "NEW_MESSAGE", readAt: null, link: `/messages?with=${user.id}` } });
    if (!unread)
      await notify(d.recipientId, { type: "NEW_MESSAGE", title: `New message from ${user.name}`, body: d.body.slice(0, 140), link: `/messages?with=${user.id}` });
    revalidatePath("/messages");
    return { ok: true };
  });
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(ids?.length ? { id: { in: ids.slice(0, 200) } } : {}) },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await db.notification.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/notifications");
    return { ok: true };
  });
}
