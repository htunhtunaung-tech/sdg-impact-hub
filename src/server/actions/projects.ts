"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { canManageOrganization, canManageProject, isAdmin } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { evaluateAchievements } from "@/lib/gamification";
import { milestoneSchema, projectSchema, projectUpdateSchema, PROJECT_STATUSES } from "@/lib/validation";
import { randomSuffix, slugify } from "@/lib/utils";

async function uniqueSlug(title: string) {
  const base = slugify(title) || "project";
  if (!(await db.project.findUnique({ where: { slug: base } }))) return base;
  return `${base}-${randomSuffix(4)}`;
}

async function recomputeProgress(projectId: string) {
  const ms = await db.projectMilestone.findMany({ where: { projectId }, select: { completedAt: true } });
  const progress = ms.length ? Math.round((ms.filter((m) => m.completedAt).length / ms.length) * 100) : 0;
  await db.project.update({ where: { id: projectId }, data: { progress } });
}

function projectData(d: ReturnType<typeof projectSchema.parse>) {
  return {
    title: d.title,
    summary: d.summary,
    description: d.description,
    objectives: d.objectives,
    tasks: d.tasks,
    status: d.status,
    imageUrl: d.imageUrl ?? null,
    budget: d.budget ?? null,
    fundingGoal: d.fundingGoal ?? null,
    currency: d.currency,
    isOnline: d.isOnline,
    locationName: d.isOnline ? (d.locationName ?? "Online") : (d.locationName ?? null),
    city: d.isOnline ? null : (d.city ?? null),
    country: d.isOnline ? null : (d.country ?? null),
    latitude: d.isOnline ? null : (d.latitude ?? null),
    longitude: d.isOnline ? null : (d.longitude ?? null),
    startDate: d.startDate,
    endDate: d.endDate,
    scheduleText: d.scheduleText ?? null,
    commitment: d.commitment ?? null,
    skillsNeeded: d.skillsNeeded,
    volunteersNeeded: d.volunteersNeeded,
  };
}

export async function createProjectAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("create-project", 10, 3600, user.id);
    const d = parseOrThrow(projectSchema, input);
    let autoApprove = isAdmin(user);
    if (d.organizationId) {
      if (!(await canManageOrganization(user, d.organizationId))) throw new ActionError("You can only create projects for organizations you manage.");
      const org = await db.organization.findUnique({ where: { id: d.organizationId }, select: { verificationStatus: true } });
      autoApprove ||= org?.verificationStatus === "VERIFIED";
    }
    const validMetrics = await db.impactMetric.findMany({ where: { id: { in: d.impactTargets.map((t) => t.metricId) } }, select: { id: true } });
    const metricIds = new Set(validMetrics.map((m) => m.id));
    const slug = await uniqueSlug(d.title);
    const project = await db.project.create({
      data: {
        ...projectData(d),
        slug,
        organizerId: user.id,
        organizationId: d.organizationId,
        moderationStatus: autoApprove ? "APPROVED" : "PENDING_REVIEW",
        goals: { create: d.goals.map((goalId) => ({ goalId, isPrimary: goalId === d.primaryGoal })) },
        members: { create: { userId: user.id, role: "ORGANIZER" } },
        impactTargets: { create: d.impactTargets.filter((t) => metricIds.has(t.metricId)).map((t) => ({ metricId: t.metricId, targetValue: t.targetValue })) },
      },
    });
    await db.activity.create({
      data: { actorId: user.id, type: "CREATED_PROJECT", message: `created ${project.title}`, link: `/projects/${slug}`, isPublic: autoApprove },
    });
    if (!autoApprove) {
      const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      for (const a of admins) await notify(a.id, { type: "SYSTEM", title: "New project awaiting review", body: project.title, link: "/admin/projects" });
    } else {
      await evaluateAchievements(user.id);
    }
    revalidatePath("/projects");
    return {
      ok: true,
      data: { slug },
      message: autoApprove ? "Project published." : "Project submitted. An administrator will review it before it's public.",
    };
  });
}

export async function updateProjectAction(projectId: string, input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!(await canManageProject(user, projectId))) throw new ActionError("You don't have permission to edit this project.");
    const d = parseOrThrow(projectSchema, input);
    const current = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { organizationId: true, slug: true } });
    if (d.organizationId && d.organizationId !== current.organizationId && !(await canManageOrganization(user, d.organizationId))) {
      throw new ActionError("You can only link organizations you manage.");
    }
    const validMetrics = await db.impactMetric.findMany({ where: { id: { in: d.impactTargets.map((t) => t.metricId) } }, select: { id: true } });
    const metricIds = new Set(validMetrics.map((m) => m.id));
    await db.$transaction([
      db.project.update({ where: { id: projectId }, data: { ...projectData(d), organizationId: d.organizationId } }),
      db.projectGoal.deleteMany({ where: { projectId } }),
      db.projectGoal.createMany({ data: d.goals.map((goalId) => ({ projectId, goalId, isPrimary: goalId === d.primaryGoal })) }),
      db.projectImpactTarget.deleteMany({ where: { projectId } }),
      db.projectImpactTarget.createMany({
        data: d.impactTargets.filter((t) => metricIds.has(t.metricId)).map((t) => ({ projectId, metricId: t.metricId, targetValue: t.targetValue })),
      }),
    ]);
    revalidatePath(`/projects/${current.slug}`);
    return { ok: true, data: { slug: current.slug }, message: "Project updated." };
  });
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const p = await db.project.findUnique({ where: { id: projectId }, select: { organizerId: true } });
    if (!p) throw new ActionError("Project not found.");
    if (p.organizerId !== user.id && !isAdmin(user)) throw new ActionError("Only the organizer or an administrator can delete a project.");
    await db.project.delete({ where: { id: projectId } });
    revalidatePath("/projects");
    return { ok: true, message: "Project deleted." };
  });
}

export async function setProjectStatusAction(projectId: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!PROJECT_STATUSES.includes(status as ProjectStatus)) throw new ActionError("Invalid status.");
    if (!(await canManageProject(user, projectId))) throw new ActionError("You don't have permission to change this project.");
    const p = await db.project.update({ where: { id: projectId }, data: { status: status as ProjectStatus } });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: "Status updated." };
  });
}

export async function joinProjectAction(projectId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("join-project", 20, 3600, user.id);
    const p = await db.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { members: { where: { role: "VOLUNTEER" } } } } },
    });
    if (!p || p.moderationStatus !== "APPROVED") throw new ActionError("This project isn't available.");
    if (p.status === "COMPLETED") throw new ActionError("This project has finished.");
    if (p.status === "PLANNING") throw new ActionError("This project isn't recruiting yet. Save it to hear when it opens.");
    if (p.volunteersNeeded > 0 && p._count.members >= p.volunteersNeeded) throw new ActionError("This project is full. Check its volunteer opportunities for one-off roles.");
    const existing = await db.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    if (existing) return { ok: true, message: "You're already part of this project." };
    await db.projectMember.create({ data: { projectId, userId: user.id, role: "VOLUNTEER" } });
    await db.activity.create({ data: { actorId: user.id, type: "JOINED_PROJECT", message: `joined ${p.title}`, link: `/projects/${p.slug}` } });
    await notify(p.organizerId, { type: "APPLICATION_RECEIVED", title: `New volunteer on ${p.title}`, body: `${user.name} joined your project.`, link: `/projects/${p.slug}?tab=team` });
    await evaluateAchievements(user.id);
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: `Welcome to ${p.title}!` };
  });
}

export async function leaveProjectAction(projectId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const p = await db.project.findUnique({ where: { id: projectId }, select: { organizerId: true, slug: true } });
    if (!p) throw new ActionError("Project not found.");
    if (p.organizerId === user.id) throw new ActionError("Organizers can't leave their own project. Transfer or delete it instead.");
    await db.projectMember.deleteMany({ where: { projectId, userId: user.id } });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: "You've left the project." };
  });
}

export async function removeProjectMemberAction(projectId: string, userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!(await canManageProject(user, projectId))) throw new ActionError("You don't have permission to manage this team.");
    const p = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { organizerId: true, slug: true } });
    if (userId === p.organizerId) throw new ActionError("The organizer can't be removed.");
    await db.projectMember.deleteMany({ where: { projectId, userId } });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: "Member removed." };
  });
}

export async function setProjectMemberRoleAction(projectId: string, userId: string, role: "COORDINATOR" | "VOLUNTEER"): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!["COORDINATOR", "VOLUNTEER"].includes(role)) throw new ActionError("Invalid role.");
    if (!(await canManageProject(user, projectId))) throw new ActionError("You don't have permission to manage this team.");
    const p = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { organizerId: true, slug: true } });
    if (userId === p.organizerId) throw new ActionError("The organizer's role can't be changed.");
    await db.projectMember.update({ where: { projectId_userId: { projectId, userId } }, data: { role } });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: role === "COORDINATOR" ? "Promoted to coordinator." : "Role updated." };
  });
}

export async function toggleSaveProjectAction(projectId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const key = { userId_projectId: { userId: user.id, projectId } };
    const existing = await db.savedProject.findUnique({ where: key });
    if (existing) {
      await db.savedProject.delete({ where: key });
      revalidatePath("/projects");
      return { ok: true, message: "Removed from saved projects." };
    }
    const exists = await db.project.count({ where: { id: projectId } });
    if (!exists) throw new ActionError("Project not found.");
    await db.savedProject.create({ data: { userId: user.id, projectId } });
    revalidatePath("/projects");
    return { ok: true, message: "Saved. Find it under Projects → Saved." };
  });
}

export async function addMilestoneAction(projectId: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!(await canManageProject(user, projectId))) throw new ActionError("You don't have permission to edit milestones.");
    const d = parseOrThrow(milestoneSchema, input);
    const count = await db.projectMilestone.count({ where: { projectId } });
    await db.projectMilestone.create({ data: { projectId, title: d.title, description: d.description, dueDate: d.dueDate, order: count } });
    await recomputeProgress(projectId);
    const p = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { slug: true } });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: "Milestone added." };
  });
}

export async function toggleMilestoneAction(milestoneId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const m = await db.projectMilestone.findUnique({ where: { id: milestoneId }, include: { project: { select: { slug: true, title: true } } } });
    if (!m) throw new ActionError("Milestone not found.");
    if (!(await canManageProject(user, m.projectId))) throw new ActionError("You don't have permission to edit milestones.");
    const completing = !m.completedAt;
    await db.projectMilestone.update({
      where: { id: milestoneId },
      data: { completedAt: completing ? new Date() : null, completedById: completing ? user.id : null },
    });
    if (completing) {
      await db.activity.create({
        data: { actorId: user.id, type: "MILESTONE_COMPLETED", message: `completed “${m.title}” on ${m.project.title}`, link: `/projects/${m.project.slug}` },
      });
    }
    await recomputeProgress(m.projectId);
    revalidatePath(`/projects/${m.project.slug}`);
    return { ok: true, message: completing ? "Milestone completed." : "Milestone reopened." };
  });
}

export async function deleteMilestoneAction(milestoneId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const m = await db.projectMilestone.findUnique({ where: { id: milestoneId }, include: { project: { select: { slug: true } } } });
    if (!m) throw new ActionError("Milestone not found.");
    if (!(await canManageProject(user, m.projectId))) throw new ActionError("You don't have permission to edit milestones.");
    await db.projectMilestone.delete({ where: { id: milestoneId } });
    await recomputeProgress(m.projectId);
    revalidatePath(`/projects/${m.project.slug}`);
    return { ok: true, message: "Milestone deleted." };
  });
}

export async function postProjectUpdateAction(projectId: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("project-update", 10, 3600, user.id);
    if (!(await canManageProject(user, projectId))) throw new ActionError("Only the project team can post progress reports.");
    const d = parseOrThrow(projectUpdateSchema, input);
    const p = await db.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { goals: { where: { isPrimary: true } }, members: { select: { userId: true } } },
    });
    await db.post.create({
      data: {
        authorId: user.id, type: "PROJECT_UPDATE", title: d.title, body: d.body, projectId,
        organizationId: p.organizationId, goalId: p.goals[0]?.goalId ?? null,
      },
    });
    await db.activity.create({ data: { actorId: user.id, type: "POSTED_UPDATE", message: `posted an update on ${p.title}`, link: `/projects/${p.slug}?tab=updates` } });
    const recipients = p.members.map((m) => m.userId).filter((id) => id !== user.id);
    await db.notification.createMany({
      data: recipients.map((userId) => ({
        userId, type: "PROJECT_UPDATE" as const, title: `${p.title} posted an update`, body: d.title, link: `/projects/${p.slug}?tab=updates`,
      })),
    });
    revalidatePath(`/projects/${p.slug}`);
    return { ok: true, message: "Update published to the team and the community feed." };
  });
}
