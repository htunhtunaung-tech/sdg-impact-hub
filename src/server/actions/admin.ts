"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { requireActionAdmin } from "@/lib/session";
import { notify } from "@/lib/notify";
import { evaluateAchievements } from "@/lib/gamification";
import { sdgEditSchema } from "@/lib/validation";

const ROLES = ["INDIVIDUAL", "STUDENT", "VOLUNTEER", "ORGANIZER", "ORGANIZATION", "ADMIN"] as const;

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionAdmin();
    if (!ROLES.includes(role as never)) throw new ActionError("Invalid role.");
    if (userId === admin.id && role !== "ADMIN") throw new ActionError("You can't remove your own admin role.");
    await db.user.update({ where: { id: userId }, data: { role: role as (typeof ROLES)[number] } });
    revalidatePath("/admin/users");
    return { ok: true, message: "Role updated." };
  });
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionAdmin();
    if (userId === admin.id) throw new ActionError("You can't suspend yourself.");
    if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new ActionError("Invalid status.");
    await db.user.update({ where: { id: userId }, data: { status } });
    revalidatePath("/admin/users");
    return { ok: true, message: status === "SUSPENDED" ? "User suspended. They can no longer sign in." : "User reactivated." };
  });
}

export async function verifyOrganizationAction(orgId: string, decision: "VERIFIED" | "REJECTED"): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionAdmin();
    if (!["VERIFIED", "REJECTED"].includes(decision)) throw new ActionError("Invalid decision.");
    const org = await db.organization.update({ where: { id: orgId }, data: { verificationStatus: decision, verifiedAt: decision === "VERIFIED" ? new Date() : null } });
    const owners = await db.organizationMember.findMany({ where: { organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } } });
    for (const o of owners)
      await notify(o.userId, {
        type: "ORGANIZATION_VERIFIED",
        title: decision === "VERIFIED" ? `${org.name} is verified` : `${org.name} wasn't verified`,
        body: decision === "VERIFIED" ? "Your projects can now be published without review." : "Contact the platform team for details.",
        link: `/organizations/${org.slug}`,
      }, { email: true });
    revalidatePath("/admin/organizations");
    return { ok: true, message: decision === "VERIFIED" ? "Organization verified." : "Organization rejected." };
  });
}

export async function moderateProjectAction(projectId: string, decision: "APPROVED" | "REJECTED", note?: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionAdmin();
    if (!["APPROVED", "REJECTED"].includes(decision)) throw new ActionError("Invalid decision.");
    const p = await db.project.update({ where: { id: projectId }, data: { moderationStatus: decision, moderationNote: note?.slice(0, 500) || null } });
    await notify(p.organizerId, {
      type: "PROJECT_REVIEWED",
      title: decision === "APPROVED" ? `${p.title} is live!` : `${p.title} needs changes`,
      body: decision === "APPROVED" ? "Your project is now public. Start recruiting volunteers." : note || "An administrator couldn't approve it as submitted.",
      link: `/projects/${p.slug}`,
    }, { email: true });
    if (decision === "APPROVED") {
      await db.activity.updateMany({ where: { actorId: p.organizerId, type: "CREATED_PROJECT", link: `/projects/${p.slug}` }, data: { isPublic: true } });
      await evaluateAchievements(p.organizerId);
    }
    revalidatePath("/admin/projects");
    return { ok: true, message: decision === "APPROVED" ? "Project approved and published." : "Project rejected." };
  });
}

export async function resolveReportAction(reportId: string, action: "DISMISS" | "HIDE" | "SUSPEND", resolution?: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionAdmin();
    const r = await db.report.findUnique({ where: { id: reportId } });
    if (!r || r.status !== "OPEN") throw new ActionError("Report already handled.");
    if (action === "HIDE") {
      if (r.targetType === "POST") await db.post.updateMany({ where: { id: r.targetId }, data: { isHidden: true } });
      else if (r.targetType === "COMMENT") await db.comment.updateMany({ where: { id: r.targetId }, data: { isHidden: true } });
      else if (r.targetType === "PROJECT") await db.project.updateMany({ where: { id: r.targetId }, data: { moderationStatus: "REJECTED", moderationNote: "Hidden after a content report" } });
      else throw new ActionError("This content type can't be hidden — dismiss or suspend instead.");
    }
    if (action === "SUSPEND") {
      const authorId =
        r.targetType === "USER" ? r.targetId
        : r.targetType === "POST" ? (await db.post.findUnique({ where: { id: r.targetId } }))?.authorId
        : r.targetType === "COMMENT" ? (await db.comment.findUnique({ where: { id: r.targetId } }))?.authorId
        : r.targetType === "MESSAGE" ? (await db.message.findUnique({ where: { id: r.targetId } }))?.senderId
        : null;
      if (!authorId) throw new ActionError("Couldn't find the account behind this content.");
      if (authorId === admin.id) throw new ActionError("You can't suspend yourself.");
      await db.user.update({ where: { id: authorId }, data: { status: "SUSPENDED" } });
    }
    await db.report.update({
      where: { id: reportId },
      data: { status: action === "DISMISS" ? "DISMISSED" : "RESOLVED", resolvedById: admin.id, resolvedAt: new Date(), resolution: resolution?.slice(0, 500) || action.toLowerCase() },
    });
    revalidatePath("/admin/reports");
    return { ok: true, message: action === "DISMISS" ? "Report dismissed." : action === "HIDE" ? "Content hidden." : "Account suspended." };
  });
}

export async function updateSdgAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await requireActionAdmin();
    const d = parseOrThrow(sdgEditSchema, input);
    await db.sDGGoal.update({ where: { id: d.id }, data: { tagline: d.tagline, description: d.description, challenges: d.challenges, waysToContribute: d.waysToContribute, isActive: d.isActive } });
    revalidatePath(`/sdgs/${d.id}`);
    revalidatePath("/sdgs");
    return { ok: true, message: `Goal ${d.id} updated.` };
  });
}
