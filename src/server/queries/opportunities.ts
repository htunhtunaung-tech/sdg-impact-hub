import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { OpportunityRowData } from "@/components/volunteer/opportunity-row";

export const oppInclude = (userId?: string) =>
  ({
    organization: { select: { name: true } },
    _count: { select: { applications: { where: { status: { in: ["PENDING", "APPROVED"] } } } } },
    applications: userId ? { where: { userId }, select: { id: true, status: true } } : false,
  }) satisfies Prisma.VolunteerOpportunityInclude;

type OppWithInclude = Prisma.VolunteerOpportunityGetPayload<{ include: ReturnType<typeof oppInclude> }>;

export function toRow(o: OppWithInclude, distanceKm?: number | null): OpportunityRowData {
  return {
    id: o.id,
    title: o.title,
    goalId: o.goalId,
    orgName: o.organization?.name ?? null,
    startsAt: o.startsAt,
    endsAt: o.endsAt,
    isOnline: o.isOnline,
    locationName: o.locationName,
    spots: o.spots,
    taken: o._count.applications,
    requiresApproval: o.requiresApproval,
    status: o.status,
    myApplication: Array.isArray(o.applications) ? (o.applications[0] ?? null) : null,
    distanceKm,
  };
}

export async function upcomingOpportunityRows(where: Prisma.VolunteerOpportunityWhereInput, userId?: string, take = 5) {
  const rows = await db.volunteerOpportunity.findMany({
    where: { status: "OPEN", startsAt: { gt: new Date() }, ...where },
    include: oppInclude(userId),
    orderBy: { startsAt: "asc" },
    take,
  });
  return rows.map((r) => toRow(r));
}
