"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { reviewSubmission } from "@/lib/impact-review";
import { daysBetween, impactSubmissionSchema, reviewSchema } from "@/lib/validation";

export async function submitImpactAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("impact-submit", 30, 3600, user.id);
    const d = parseOrThrow(impactSubmissionSchema, input);

    if (d.projectId) {
      const member = await db.projectMember.findUnique({ where: { projectId_userId: { projectId: d.projectId, userId: user.id } } });
      if (!member) throw new ActionError("You can only log impact for projects you're part of.", { projectId: "Join this project first" });
    }
    if (d.opportunityId) {
      const app = await db.volunteerApplication.findUnique({ where: { opportunityId_userId: { opportunityId: d.opportunityId, userId: user.id } } });
      if (!app || !["APPROVED", "COMPLETED"].includes(app.status)) throw new ActionError("You can only log impact for opportunities you were confirmed for.");
      const dupe = await db.impactSubmission.findFirst({ where: { userId: user.id, opportunityId: d.opportunityId, status: { not: "REJECTED" } } });
      if (dupe) throw new ActionError("You've already recorded this activity.");
    }
    // Guard against implausible totals: at most 24 hours logged per day, also across entries.
    const endDate = d.endDate && daysBetween(d.date, d.endDate) > 1 ? d.endDate : null;
    if (!endDate) {
      const sameDay = await db.impactSubmission.aggregate({ where: { userId: user.id, date: d.date, endDate: null, status: { not: "REJECTED" } }, _sum: { hours: true } });
      if (Number(sameDay._sum.hours ?? 0) + d.hours > 24) throw new ActionError("That would be more than 24 hours on one day.", { hours: "Too many hours for this day" });
    } else {
      // Everything already logged that starts inside this period, plus this entry, must fit in 24 h a day.
      const inside = await db.impactSubmission.aggregate({ where: { userId: user.id, date: { gte: d.date, lte: endDate }, status: { not: "REJECTED" } }, _sum: { hours: true } });
      if (Number(inside._sum.hours ?? 0) + d.hours > daysBetween(d.date, endDate) * 24)
        throw new ActionError("Together with what you've already logged, that's more hours than these days have.", { hours: "Too many hours for these dates" });
    }
    if (d.hours === 0 && d.values.every((v) => v.value === 0)) throw new ActionError("Add hours or at least one measured outcome.", { hours: "Add hours or an outcome" });

    const metrics = await db.impactMetric.findMany({ where: { id: { in: d.values.map((v) => v.metricId) } }, select: { id: true } });
    const ok = new Set(metrics.map((m) => m.id));
    const s = await db.impactSubmission.create({
      data: {
        userId: user.id, goalId: d.goalId, projectId: d.projectId, opportunityId: d.opportunityId, title: d.title, description: d.description,
        date: d.date, endDate, hours: d.hours, evidenceUrl: d.evidenceUrl,
        values: { create: d.values.filter((v) => ok.has(v.metricId) && v.value > 0).map((v) => ({ metricId: v.metricId, value: v.value })) },
      },
    });
    await db.activity.create({ data: { actorId: user.id, type: "SUBMITTED_IMPACT", message: `recorded “${d.title}”`, isPublic: false } });
    // Let the project team know there's something to verify.
    if (d.projectId) {
      const p = await db.project.findUnique({ where: { id: d.projectId }, select: { organizerId: true, slug: true, title: true } });
      if (p && p.organizerId !== user.id)
        await notify(p.organizerId, { type: "SYSTEM", title: `Contribution to verify on ${p.title}`, body: `${user.name} recorded “${d.title}”.`, link: `/projects/${p.slug}?tab=manage` });
    }
    revalidatePath("/impact");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: s.id }, message: "Recorded. It counts as self-reported until an organizer verifies it." };
  });
}

export async function reviewImpactAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const d = parseOrThrow(reviewSchema, input);
    const xp = await reviewSubmission(user, d.id, d.decision, d.note);
    revalidatePath("/admin/impact");
    revalidatePath("/projects", "layout");
    return { ok: true, message: d.decision === "VERIFIED" ? `Verified. The volunteer earned ${xp} XP.` : "Marked as not verified." };
  });
}

export async function deleteSubmissionAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const s = await db.impactSubmission.findUnique({ where: { id } });
    if (!s || s.userId !== user.id) throw new ActionError("Not found.");
    if (s.status === "VERIFIED") throw new ActionError("Verified contributions can't be deleted. Contact an administrator if something is wrong.");
    await db.impactSubmission.delete({ where: { id } });
    revalidatePath("/impact");
    return { ok: true, message: "Entry deleted." };
  });
}
