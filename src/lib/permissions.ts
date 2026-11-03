import "server-only";
import { db } from "@/lib/db";

type Actor = { id: string; role: string };

export const isAdmin = (u: Actor | null | undefined) => u?.role === "ADMIN";

/** Organizer, project coordinators, admins of the owning organization and platform admins can manage a project. */
export async function canManageProject(user: Actor | null | undefined, projectId: string) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      organizerId: true,
      organizationId: true,
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });
  if (!project) return false;
  if (project.organizerId === user.id) return true;
  if (project.members.some((m) => m.role === "ORGANIZER" || m.role === "COORDINATOR")) return true;
  if (project.organizationId) return canManageOrganization(user, project.organizationId);
  return false;
}

export async function canManageOrganization(user: Actor | null | undefined, organizationId: string) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const m = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
  });
  return m?.role === "OWNER" || m?.role === "ADMIN";
}

export async function canManageOpportunity(user: Actor | null | undefined, opportunityId: string) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const opp = await db.volunteerOpportunity.findUnique({
    where: { id: opportunityId },
    select: { createdById: true, projectId: true, organizationId: true },
  });
  if (!opp) return false;
  if (opp.createdById === user.id) return true;
  if (opp.projectId && (await canManageProject(user, opp.projectId))) return true;
  if (opp.organizationId && (await canManageOrganization(user, opp.organizationId))) return true;
  return false;
}

/** Projects a user is allowed to see: approved ones, or their own / ones they manage. */
export function projectVisibilityWhere(user: Actor | null | undefined) {
  if (isAdmin(user)) return {};
  if (!user) return { moderationStatus: "APPROVED" as const };
  return {
    OR: [
      { moderationStatus: "APPROVED" as const },
      { organizerId: user.id },
      { members: { some: { userId: user.id, role: { in: ["ORGANIZER" as const, "COORDINATOR" as const] } } } },
    ],
  };
}
