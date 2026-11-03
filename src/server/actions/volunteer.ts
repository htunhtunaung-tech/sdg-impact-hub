"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { canManageOpportunity, canManageProject, isAdmin } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { evaluateAchievements, touchStreak, xpForSubmission } from "@/lib/gamification";
import { applicationSchema, opportunitySchema } from "@/lib/validation";
import { formatDate } from "@/lib/utils";

const ACTIVE = ["PENDING", "APPROVED"] as const;

async function takenSpots(opportunityId: string) {
  return db.volunteerApplication.count({ where: { opportunityId, status: { in: [...ACTIVE] } } });
}

export async function applyToOpportunityAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("apply", 20, 3600, user.id);
    const d = parseOrThrow(applicationSchema, input);
    const opp = await db.volunteerOpportunity.findUnique({ where: { id: d.opportunityId } });
    if (!opp || opp.status !== "OPEN") throw new ActionError("This opportunity is no longer open.");
    if (opp.startsAt < new Date()) throw new ActionError("This opportunity has already started.");
    const existing = await db.volunteerApplication.findUnique({ where: { opportunityId_userId: { opportunityId: opp.id, userId: user.id } } });
    if (existing && existing.status !== "WITHDRAWN") {
      if (existing.status === "REJECTED") throw new ActionError("The organizer wasn't able to accept your application for this opportunity.");
      return { ok: true, data: { status: existing.status }, message: "You've already signed up." };
    }
    const full = (await takenSpots(opp.id)) >= opp.spots;
    const status = full ? "WAITLISTED" : opp.requiresApproval ? "PENDING" : "APPROVED";
    const data = { status, motivation: d.motivation, availability: d.availability, wantsReminder: d.wantsReminder, reviewedAt: null, reviewedById: null, reviewNote: null } as const;
    if (existing) await db.volunteerApplication.update({ where: { id: existing.id }, data });
    else await db.volunteerApplication.create({ data: { ...data, opportunityId: opp.id, userId: user.id } });

    if (status === "APPROVED" && opp.projectId) {
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId: opp.projectId, userId: user.id } },
        create: { projectId: opp.projectId, userId: user.id, role: "VOLUNTEER" },
        update: {},
      });
    }
    await db.activity.create({ data: { actorId: user.id, type: "APPLIED_OPPORTUNITY", message: `signed up for ${opp.title}`, link: `/volunteer/${opp.id}` } });
    await notify(
      opp.createdById,
      {
        type: "APPLICATION_RECEIVED",
        title: `${status === "WAITLISTED" ? "Waitlist" : "New"} sign-up: ${opp.title}`,
        body: `${user.name} ${status === "WAITLISTED" ? "joined the waitlist" : status === "PENDING" ? "applied and is waiting for your approval" : "signed up"}.`,
        link: "/volunteer/manage",
      },
      { email: status === "PENDING" },
    );
    revalidatePath("/volunteer");
    revalidatePath(`/volunteer/${opp.id}`);
    const msg =
      status === "APPROVED" ? "You're signed up! See you there." : status === "PENDING" ? "Application sent. The organizer will confirm your spot." : "This one is full — you're on the waitlist.";
    return { ok: true, data: { status }, message: msg };
  });
}

export async function withdrawApplicationAction(applicationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const app = await db.volunteerApplication.findUnique({ where: { id: applicationId }, include: { opportunity: true } });
    if (!app || app.userId !== user.id) throw new ActionError("Application not found.");
    if (app.status === "COMPLETED") throw new ActionError("Completed sign-ups can't be cancelled.");
    await db.volunteerApplication.update({ where: { id: app.id }, data: { status: "WITHDRAWN" } });
    // Promote the earliest waitlisted volunteer.
    if (app.status === "APPROVED" || app.status === "PENDING") {
      const next = await db.volunteerApplication.findFirst({ where: { opportunityId: app.opportunityId, status: "WAITLISTED" }, orderBy: { createdAt: "asc" } });
      if (next) {
        await db.volunteerApplication.update({ where: { id: next.id }, data: { status: app.opportunity.requiresApproval ? "PENDING" : "APPROVED" } });
        await notify(next.userId, { type: "APPLICATION_UPDATED", title: `A spot opened up: ${app.opportunity.title}`, body: "You've been moved off the waitlist.", link: `/volunteer/${app.opportunityId}` }, { email: true });
      }
    }
    await notify(app.opportunity.createdById, { type: "APPLICATION_UPDATED", title: `Sign-up cancelled: ${app.opportunity.title}`, body: `${user.name} cancelled their spot.`, link: "/volunteer/manage" });
    revalidatePath("/volunteer");
    revalidatePath(`/volunteer/${app.opportunityId}`);
    return { ok: true, message: "Your spot has been cancelled." };
  });
}

export async function reviewApplicationAction(applicationId: string, decision: "APPROVED" | "REJECTED" | "WAITLISTED", note?: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!["APPROVED", "REJECTED", "WAITLISTED"].includes(decision)) throw new ActionError("Invalid decision.");
    const app = await db.volunteerApplication.findUnique({ where: { id: applicationId }, include: { opportunity: true } });
    if (!app) throw new ActionError("Application not found.");
    if (!(await canManageOpportunity(user, app.opportunityId))) throw new ActionError("You can't manage applications for this opportunity.");
    if (decision === "APPROVED" && app.status !== "APPROVED") {
      const approved = await db.volunteerApplication.count({ where: { opportunityId: app.opportunityId, status: "APPROVED" } });
      if (approved >= app.opportunity.spots) throw new ActionError("All spots are filled. Increase the number of spots or waitlist this volunteer.");
    }
    await db.volunteerApplication.update({
      where: { id: app.id },
      data: { status: decision, reviewNote: note?.slice(0, 500) || null, reviewedById: user.id, reviewedAt: new Date() },
    });
    if (decision === "APPROVED") {
      if (app.opportunity.projectId) {
        await db.projectMember.upsert({
          where: { projectId_userId: { projectId: app.opportunity.projectId, userId: app.userId } },
          create: { projectId: app.opportunity.projectId, userId: app.userId, role: "VOLUNTEER" },
          update: {},
        });
      }
      await db.activity.create({ data: { actorId: app.userId, type: "APPROVED_FOR_OPPORTUNITY", message: `was confirmed for ${app.opportunity.title}`, link: `/volunteer/${app.opportunityId}` } });
      await evaluateAchievements(app.userId);
    }
    const title =
      decision === "APPROVED" ? `You're confirmed for ${app.opportunity.title}` : decision === "WAITLISTED" ? `You're on the waitlist for ${app.opportunity.title}` : `Update on ${app.opportunity.title}`;
    const body =
      decision === "APPROVED"
        ? `See you on ${formatDate(app.opportunity.startsAt, { weekday: "long", day: "numeric", month: "long" })}.`
        : decision === "WAITLISTED"
          ? "We'll let you know if a spot opens up."
          : `The organizer couldn't offer you a spot this time.${note ? ` Note: ${note}` : ""}`;
    await notify(app.userId, { type: "APPLICATION_UPDATED", title, body, link: `/volunteer/${app.opportunityId}` }, { email: true });
    revalidatePath("/volunteer/manage");
    return { ok: true, message: decision === "APPROVED" ? "Volunteer approved." : decision === "WAITLISTED" ? "Moved to waitlist." : "Application declined." };
  });
}

/** Organizer confirms attendance: creates (or verifies) an organizer-verified impact record. */
export async function markAttendedAction(applicationId: string, hours: number): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) throw new ActionError("Enter between 0.5 and 24 hours.");
    const app = await db.volunteerApplication.findUnique({ where: { id: applicationId }, include: { opportunity: true, user: { select: { name: true } } } });
    if (!app) throw new ActionError("Application not found.");
    if (!(await canManageOpportunity(user, app.opportunityId))) throw new ActionError("You can't manage this opportunity.");
    if (app.userId === user.id && !isAdmin(user)) throw new ActionError("You can't verify your own attendance.");
    if (app.opportunity.startsAt > new Date()) throw new ActionError("You can confirm attendance once the activity has started.");
    if (app.status !== "APPROVED" && app.status !== "COMPLETED") throw new ActionError("Only confirmed volunteers can be marked as attended.");

    const existing = await db.impactSubmission.findFirst({ where: { userId: app.userId, opportunityId: app.opportunityId } });
    if (existing?.status === "VERIFIED") throw new ActionError("Attendance is already verified for this volunteer.");
    const xp = xpForSubmission(h, true);
    const data = {
      status: "VERIFIED" as const, hours: h, reviewedById: user.id, reviewedAt: new Date(), xpAwarded: xp,
      reviewNote: "Attendance confirmed by the organizer",
    };
    if (existing) await db.impactSubmission.update({ where: { id: existing.id }, data });
    else
      await db.impactSubmission.create({
        data: {
          ...data, userId: app.userId, goalId: app.opportunity.goalId, projectId: app.opportunity.projectId, opportunityId: app.opportunityId,
          title: app.opportunity.title, date: app.opportunity.startsAt,
        },
      });
    await db.volunteerApplication.update({ where: { id: app.id }, data: { status: "COMPLETED" } });
    await db.user.update({ where: { id: app.userId }, data: { xp: { increment: xp } } });
    await touchStreak(app.userId, app.opportunity.startsAt);
    await notify(app.userId, { type: "IMPACT_REVIEWED", title: "Thanks for volunteering!", body: `${h} hours at ${app.opportunity.title} are verified. +${xp} XP`, link: "/impact" });
    await db.activity.create({ data: { actorId: app.userId, type: "IMPACT_VERIFIED", message: `had ${h} hours at ${app.opportunity.title} verified` } });
    await evaluateAchievements(app.userId);
    revalidatePath("/volunteer/manage");
    return { ok: true, message: `${app.user.name}'s ${h} hours are verified.` };
  });
}

export async function createOpportunityAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("create-opp", 20, 3600, user.id);
    const d = parseOrThrow(opportunitySchema, input);
    if (d.startsAt < new Date()) throw new ActionError("The start time must be in the future.", { startsAt: "Choose a future date" });
    let organizationId: string | null = null;
    if (d.projectId) {
      if (!(await canManageProject(user, d.projectId))) throw new ActionError("You can only add opportunities to projects you manage.");
      const p = await db.project.findUniqueOrThrow({ where: { id: d.projectId }, select: { organizationId: true, moderationStatus: true } });
      if (p.moderationStatus !== "APPROVED" && !isAdmin(user)) throw new ActionError("The project must be approved before you can recruit volunteers.");
      organizationId = p.organizationId;
    } else if (!isAdmin(user)) {
      throw new ActionError("Choose the project this opportunity belongs to.", { projectId: "Choose a project" });
    }
    const opp = await db.volunteerOpportunity.create({
      data: {
        title: d.title, description: d.description, goalId: d.goalId, projectId: d.projectId, organizationId, createdById: user.id,
        skills: d.skills, isOnline: d.isOnline, locationName: d.isOnline ? "Online" : d.locationName, city: d.isOnline ? null : d.city ?? null,
        latitude: d.isOnline ? null : d.latitude ?? null, longitude: d.isOnline ? null : d.longitude ?? null,
        startsAt: d.startsAt, endsAt: d.endsAt, spots: d.spots, requiresApproval: d.requiresApproval,
      },
    });
    revalidatePath("/volunteer");
    return { ok: true, data: { id: opp.id }, message: "Opportunity published." };
  });
}

export async function setOpportunityStatusAction(id: string, status: "OPEN" | "CLOSED" | "CANCELLED"): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!["OPEN", "CLOSED", "CANCELLED"].includes(status)) throw new ActionError("Invalid status.");
    if (!(await canManageOpportunity(user, id))) throw new ActionError("You can't manage this opportunity.");
    const opp = await db.volunteerOpportunity.update({ where: { id }, data: { status } });
    if (status === "CANCELLED") {
      const apps = await db.volunteerApplication.findMany({ where: { opportunityId: id, status: { in: ["APPROVED", "PENDING", "WAITLISTED"] } } });
      for (const a of apps) await notify(a.userId, { type: "APPLICATION_UPDATED", title: `Cancelled: ${opp.title}`, body: "The organizer cancelled this activity. Sorry for the change of plans.", link: "/volunteer" }, { email: true });
    }
    revalidatePath("/volunteer");
    revalidatePath(`/volunteer/${id}`);
    revalidatePath("/volunteer/manage");
    return { ok: true, message: status === "OPEN" ? "Opportunity reopened." : status === "CLOSED" ? "Sign-ups closed." : "Opportunity cancelled and volunteers notified." };
  });
}
