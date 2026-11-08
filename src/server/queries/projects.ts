import "server-only";
import type { Prisma } from "@prisma/client";
import type { ProjectCardData } from "@/components/projects/project-card";

export const projectCardInclude = (userId?: string) =>
  ({
    goals: { orderBy: { isPrimary: "desc" }, select: { goalId: true, isPrimary: true } },
    organization: { select: { name: true } },
    _count: { select: { members: { where: { role: "VOLUNTEER" } } } },
    saves: userId ? { where: { userId }, select: { userId: true } } : false,
  }) satisfies Prisma.ProjectInclude;

type P = Prisma.ProjectGetPayload<{ include: ReturnType<typeof projectCardInclude> }>;

export function toProjectCard(p: P, user?: { id: string } | null): ProjectCardData {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    imageUrl: p.imageUrl,
    primaryGoal: p.goals[0]?.goalId ?? 17,
    organizationName: p.organization?.name ?? null,
    location: p.isOnline ? "Online" : [p.city, p.country].filter(Boolean).join(", ") || p.locationName || "Location to be confirmed",
    volunteers: p._count.members,
    volunteersNeeded: p.volunteersNeeded,
    startDate: p.startDate,
    scheduleText: p.scheduleText,
    saved: Array.isArray(p.saves) && p.saves.length > 0,
    canSave: Boolean(user),
    moderationStatus: p.moderationStatus,
    secondaryGoals: p.goals.slice(1).map((g) => g.goalId),
    isOnline: p.isOnline,
    commitment: p.commitment,
  };
}
