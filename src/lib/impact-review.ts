import "server-only";
import { db } from "@/lib/db";
import { evaluateAchievements, touchStreak, xpForSubmission } from "@/lib/gamification";
import { notify } from "@/lib/notify";
import { toNumber } from "@/lib/utils";
import { ActionError } from "@/lib/action";
import { canManageProject, isAdmin } from "@/lib/permissions";

type Reviewer = { id: string; role: string };

/** Admins can review anything; project managers can review submissions linked to their projects (never their own). */
export async function canReviewSubmission(reviewer: Reviewer, submission: { userId: string; projectId: string | null }) {
  if (submission.userId === reviewer.id && !isAdmin(reviewer)) return false;
  if (isAdmin(reviewer)) return true;
  return submission.projectId ? canManageProject(reviewer, submission.projectId) : false;
}

export async function reviewSubmission(reviewer: Reviewer, id: string, decision: "VERIFIED" | "REJECTED", note?: string) {
  const s = await db.impactSubmission.findUnique({ where: { id } });
  if (!s) throw new ActionError("Submission not found.");
  if (!(await canReviewSubmission(reviewer, s))) throw new ActionError("You can't review this contribution.");
  if (s.status !== "PENDING") throw new ActionError("This contribution has already been reviewed.");
  const xp = decision === "VERIFIED" ? xpForSubmission(toNumber(s.hours), Boolean(s.evidenceUrl)) : 0;
  const updated = await db.impactSubmission.updateMany({
    where: { id, status: "PENDING" },
    data: { status: decision, reviewedById: reviewer.id, reviewedAt: new Date(), reviewNote: note ?? null, xpAwarded: xp },
  });
  if (updated.count === 0) throw new ActionError("This contribution has already been reviewed.");
  if (decision === "VERIFIED") {
    await db.user.update({ where: { id: s.userId }, data: { xp: { increment: xp } } });
    await touchStreak(s.userId, s.date);
    await db.activity.create({
      data: { actorId: s.userId, type: "IMPACT_VERIFIED", message: `had ${toNumber(s.hours)} hours on “${s.title}” verified`, link: s.projectId ? undefined : null },
    });
    await notify(s.userId, { type: "IMPACT_REVIEWED", title: "Your contribution was verified", body: `“${s.title}” is now verified. +${xp} XP`, link: "/impact" });
    await evaluateAchievements(s.userId);
  } else {
    await notify(s.userId, {
      type: "IMPACT_REVIEWED",
      title: "Contribution not verified",
      body: `“${s.title}” wasn't verified${note ? `: ${note}` : "."}`,
      link: "/impact",
    });
  }
  return xp;
}
