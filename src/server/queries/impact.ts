import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/utils";

/** Metrics that count people directly reached. */
export const PEOPLE_METRICS = ["people_reached", "students_educated", "people_screened", "safe_water_people"];

export async function hoursByGoal(where: Prisma.ImpactSubmissionWhereInput) {
  const rows = await db.impactSubmission.groupBy({ by: ["goalId"], where, _sum: { hours: true } });
  return rows
    .map((r) => ({ goal: r.goalId, hours: toNumber(r._sum.hours) }))
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.hours - a.hours);
}

export async function peopleReached(where: Prisma.ImpactSubmissionWhereInput) {
  const agg = await db.impactSubmissionValue.aggregate({
    where: { submission: where, metric: { key: { in: PEOPLE_METRICS } } },
    _sum: { value: true },
  });
  return agg._sum.value ?? 0;
}

export async function metricTotals(where: Prisma.ImpactSubmissionWhereInput) {
  const rows = await db.impactSubmissionValue.groupBy({ by: ["metricId"], where: { submission: where }, _sum: { value: true } });
  const metrics = await db.impactMetric.findMany({ where: { id: { in: rows.map((r) => r.metricId) } } });
  return rows
    .map((r) => {
      const m = metrics.find((x) => x.id === r.metricId)!;
      return { key: m.key, name: m.name, unit: m.unit, goalId: m.goalId, value: r._sum.value ?? 0 };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Hours per calendar month for the last `months` months (oldest first). */
export async function monthlyHours(where: Prisma.ImpactSubmissionWhereInput, months: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  const rows = await db.impactSubmission.findMany({ where: { ...where, date: { gte: start } }, select: { date: true, hours: true, status: true } });
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" }), full: d.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), verified: 0, pending: 0 };
  });
  for (const r of rows) {
    const b = buckets.find((x) => x.key === r.date.toISOString().slice(0, 7));
    if (!b) continue;
    if (r.status === "VERIFIED") b.verified += toNumber(r.hours);
    else if (r.status === "PENDING") b.pending += toNumber(r.hours);
  }
  return buckets.map((b) => ({ ...b, verified: Math.round(b.verified * 10) / 10, pending: Math.round(b.pending * 10) / 10 }));
}
