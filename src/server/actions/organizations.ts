"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { canManageOrganization } from "@/lib/permissions";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { organizationSchema } from "@/lib/validation";
import { randomSuffix, slugify } from "@/lib/utils";

export async function createOrganizationAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("create-org", 3, 86400, user.id);
    const d = parseOrThrow(organizationSchema, input);
    const base = slugify(d.name) || "organization";
    const slug = (await db.organization.findUnique({ where: { slug: base } })) ? `${base}-${randomSuffix(4)}` : base;
    await db.organization.create({
      data: { ...d, slug, createdById: user.id, members: { create: { userId: user.id, role: "OWNER" } } },
    });
    await db.activity.create({ data: { actorId: user.id, type: "CREATED_ORGANIZATION", message: `registered ${d.name}`, link: `/organizations/${slug}`, isPublic: false } });
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) await notify(a.id, { type: "SYSTEM", title: "Organization awaiting verification", body: d.name, link: "/admin/organizations" });
    revalidatePath("/organizations");
    return { ok: true, data: { slug }, message: "Organization registered. An administrator will verify it shortly." };
  });
}

export async function updateOrganizationAction(id: string, input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!(await canManageOrganization(user, id))) throw new ActionError("You can't edit this organization.");
    const d = parseOrThrow(organizationSchema, input);
    const org = await db.organization.update({ where: { id }, data: { ...d, website: d.website ?? null, email: d.email ?? null, logoUrl: d.logoUrl ?? null, mission: d.mission ?? null } });
    revalidatePath(`/organizations/${org.slug}`);
    return { ok: true, message: "Organization updated." };
  });
}

export async function addOrganizationMemberAction(orgId: string, username: string, role: "ADMIN" | "MEMBER"): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!["ADMIN", "MEMBER"].includes(role)) throw new ActionError("Invalid role.");
    if (!(await canManageOrganization(user, orgId))) throw new ActionError("You can't manage this organization's team.");
    const profile = await db.userProfile.findUnique({ where: { username: username.trim().replace(/^@/, "").toLowerCase() }, include: { user: { select: { id: true, status: true } } } });
    if (!profile || profile.user.status !== "ACTIVE") throw new ActionError("No member with that username.");
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
    await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId: profile.userId } },
      create: { organizationId: orgId, userId: profile.userId, role },
      update: { role },
    });
    await notify(profile.userId, { type: "SYSTEM", title: `You were added to ${org.name}`, body: `Role: ${role.toLowerCase()}`, link: `/organizations/${org.slug}` });
    revalidatePath(`/organizations/${org.slug}`);
    return { ok: true, message: "Member added." };
  });
}

export async function removeOrganizationMemberAction(orgId: string, userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!(await canManageOrganization(user, orgId)) && user.id !== userId) throw new ActionError("You can't manage this organization's team.");
    const m = await db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId } } });
    if (!m) throw new ActionError("Member not found.");
    if (m.role === "OWNER") throw new ActionError("The owner can't be removed.");
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
    await db.organizationMember.delete({ where: { id: m.id } });
    revalidatePath(`/organizations/${org.slug}`);
    return { ok: true, message: "Member removed." };
  });
}
