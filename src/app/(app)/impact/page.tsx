import type { Metadata } from "next";
import Link from "next/link";
import { Award, CircleCheck, Clock, Download, Globe, Hourglass, Plus, TrendingUp, Trophy, Users, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, formatInt, formatNumber, toNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { GoalBars } from "@/components/impact/goal-bars";
import { HoursAreaChart } from "@/components/charts/hours-chart";
import { hoursByGoal, metricTotals, monthlyHours, peopleReached } from "@/server/queries/impact";
import { DeleteEntryButton } from "./delete-entry";

export const metadata: Metadata = { title: "Impact Analytics" };

const RANGES = { "30d": { label: "30 days", days: 30, months: 2 }, "90d": { label: "90 days", days: 90, months: 3 }, "12m": { label: "12 months", days: 365, months: 12 }, all: { label: "All time", days: 0, months: 24 } } as const;
type RangeKey = keyof typeof RANGES;

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round(((a - b) / b) * 100);
}

export default async function ImpactPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser("/impact");
  const rk = ((await searchParams).range ?? "12m") as RangeKey;
  const range = RANGES[rk] ?? RANGES["12m"];
  const now = new Date();
  const since = range.days ? new Date(now.getTime() - range.days * 86400_000) : undefined;
  const prevSince = range.days ? new Date(now.getTime() - 2 * range.days * 86400_000) : undefined;
  const base = { userId: user.id, status: "VERIFIED" as const };
  const inRange = since ? { ...base, date: { gte: since } } : base;
  const inPrev = since && prevSince ? { ...base, date: { gte: prevSince, lt: since } } : null;

  const [hours, prevHours, people, prevPeople, verifiedCount, pendingCount, byGoal, monthly, totals, projects, recent, rank] = await Promise.all([
    db.impactSubmission.aggregate({ where: inRange, _sum: { hours: true } }),
    inPrev ? db.impactSubmission.aggregate({ where: inPrev, _sum: { hours: true } }) : null,
    peopleReached(inRange),
    inPrev ? peopleReached(inPrev) : null,
    db.impactSubmission.count({ where: inRange }),
    db.impactSubmission.count({ where: { userId: user.id, status: "PENDING" } }),
    hoursByGoal(inRange),
    monthlyHours({ userId: user.id }, range.months),
    metricTotals(inRange),
    db.impactSubmission.findMany({ where: { ...inRange, projectId: { not: null } }, distinct: ["projectId"], select: { projectId: true } }),
    db.impactSubmission.findMany({
      where: { userId: user.id },
      include: { project: { select: { title: true, slug: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 15,
    }),
    db.$queryRaw<{ rank: bigint; total: bigint }[]>`
      WITH t AS (
        SELECT s."userId", SUM(s.hours) AS h FROM "ImpactSubmission" s
        JOIN "UserProfile" p ON p."userId" = s."userId" AND p."showOnLeaderboard" = true
        WHERE s.status = 'VERIFIED' AND s.date >= ${new Date(now.getTime() - 365 * 86400_000)}
        GROUP BY s."userId")
      SELECT (SELECT COUNT(*) FROM t WHERE h > COALESCE((SELECT h FROM t WHERE "userId" = ${user.id}), 0)) + 1 AS rank, (SELECT COUNT(*) FROM t) AS total`,
  ]);
  const h = toNumber(hours._sum.hours);
  const hDelta = prevHours ? pct(h, toNumber(prevHours._sum.hours)) : null;
  const pDelta = prevPeople != null ? pct(people, prevPeople) : null;
  const myRank = rank[0];
  const totalMonth = monthly.reduce((s, m) => s + m.verified, 0);

  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader
        title="Impact Analytics"
        description="Track what your time has achieved, and share it."
        actions={
          <>
            <nav className="flex rounded-[12px] bg-slate-100 p-1" aria-label="Time range">
              {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                <Link key={k} href={`/impact?range=${k}`} aria-current={k === rk ? "page" : undefined} className={`rounded-[9px] px-3 py-1.5 text-sm font-medium ${k === rk ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>
                  {RANGES[k].label}
                </Link>
              ))}
            </nav>
            <Button variant="secondary" asChild>
              <a href={`/api/impact/export?range=${rk}`}><Download /> Export CSV</a>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Summary">
        <Stat icon={<Clock />} label="Volunteer hours" value={formatNumber(h)} trend={hDelta != null && hDelta > 0 ? "up" : null}
          sub={hDelta != null ? <span className="inline-flex items-center gap-1">{hDelta > 0 && <TrendingUp className="size-3.5" />}{hDelta >= 0 ? "+" : ""}{hDelta}% vs previous {range.label}</span> : "Verified only"} />
        <Stat icon={<Users />} label="People reached" value={formatInt(people)} trend={pDelta != null && pDelta > 0 ? "up" : null}
          sub={pDelta != null ? <span className="inline-flex items-center gap-1">{pDelta > 0 && <TrendingUp className="size-3.5" />}{pDelta >= 0 ? "+" : ""}{pDelta}% vs previous {range.label}</span> : "From verified activities"} />
        <Stat icon={<CircleCheck />} label="Verified activities" value={verifiedCount} sub={`${pendingCount} pending review`} />
        <Stat icon={<Globe />} label="Goals contributed" value={byGoal.length} sub={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`} />
      </section>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Volunteer hours per month</CardTitle>
              <CardDescription>{monthly[0]?.full} – {monthly.at(-1)?.full} · {formatNumber(totalMonth)} verified hours</CardDescription>
            </div>
          </CardHeader>
          <CardContent><HoursAreaChart data={monthly} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Hours by goal</CardTitle><CardDescription>Share of your {formatNumber(h)} verified hours</CardDescription></div></CardHeader>
          <CardContent className="pt-6">
            {byGoal.length ? <GoalBars rows={byGoal.slice(0, 6)} showShare /> : <p className="text-sm text-ink-muted">No verified hours in this period.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><div><CardTitle>Measured outcomes</CardTitle><CardDescription>Totals from verified contributions in this period</CardDescription></div></CardHeader>
          <CardContent>
            {totals.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {totals.map((t) => (
                  <li key={t.key} className="flex items-center gap-3 rounded-[12px] border border-border p-4">
                    <SdgNumber goal={t.goalId} size={28} />
                    <div>
                      <p className="text-xl font-bold">{formatNumber(t.value, 0)} <span className="text-sm font-normal text-ink-muted">{t.unit}</span></p>
                      <p className="text-xs text-ink-muted">{t.name}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">Add measured outcomes (trees, kg, people…) when you record impact.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Recognition</CardTitle><CardDescription>Based on verified hours, last 12 months</CardDescription></div></CardHeader>
          <CardContent className="space-y-4">
            {myRank && Number(myRank.total) > 0 && user.profile?.showOnLeaderboard !== false ? (
              <div className="flex items-center gap-3 rounded-[12px] bg-mint p-4">
                <Trophy className="size-7 text-forest-900" />
                <div><p className="text-lg font-bold text-forest-900">#{String(myRank.rank)} of {String(myRank.total)}</p><p className="text-sm text-ink-muted">on the community leaderboard</p></div>
              </div>
            ) : <p className="text-sm text-ink-muted">You&apos;re hidden from leaderboards (change in Settings).</p>}
            <Button variant="secondary" className="w-full" asChild><Link href="/impact/leaderboard">View leaderboard</Link></Button>
            <Button variant="secondary" className="w-full" asChild><Link href={`/certificate/${user.id}`} target="_blank"><Award /> Volunteer certificate</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden sm:mt-6">
        <CardHeader className="pb-4">
          <CardTitle>Recent contributions</CardTitle>
          <Button variant="secondary" size="sm" asChild><Link href="/impact/new"><Plus /> Record Your Impact</Link></Button>
        </CardHeader>
        {recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[15px]">
              <thead className="border-y border-border bg-canvas text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <tr><th className="px-6 py-3">Date</th><th className="px-3 py-3">Activity</th><th className="px-3 py-3">Project</th><th className="px-3 py-3">Goal</th><th className="px-3 py-3 text-right">Hours</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-6 py-3.5 text-ink-muted">{formatDate(r.date)}</td>
                    <td className="px-3 py-3.5 font-semibold">{r.title}{r.reviewNote && r.status === "REJECTED" && <span className="block text-xs font-normal text-danger">{r.reviewNote}</span>}</td>
                    <td className="px-3 py-3.5 text-ink-muted">{r.project ? <Link href={`/projects/${r.project.slug}`} className="hover:underline">{r.project.title}</Link> : "—"}</td>
                    <td className="px-3 py-3.5"><span className="inline-flex items-center gap-2 text-sm"><SdgNumber goal={r.goalId} size={22} /> Goal {r.goalId}</span></td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{formatNumber(toNumber(r.hours))}</td>
                    <td className="px-6 py-3.5">
                      <span className="flex items-center gap-2">
                        {r.status === "VERIFIED" ? <Badge variant="success"><CircleCheck /> Verified</Badge> : r.status === "PENDING" ? <Badge variant="warning"><Hourglass /> Self-reported</Badge> : <Badge variant="danger"><XCircle /> Not verified</Badge>}
                        {r.status !== "VERIFIED" && <DeleteEntryButton id={r.id} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardContent><EmptyState title="No contributions yet" description="Record your first activity — it becomes verified once an organizer confirms it." action={<Button asChild><Link href="/impact/new">Record Your Impact</Link></Button>} /></CardContent>
        )}
        <p className="border-t border-border px-6 py-3 text-xs text-ink-muted">
          <strong>Self-reported</strong> entries are your own estimates and are not included in totals, badges or leaderboards until a project organizer or administrator verifies them.
        </p>
      </Card>
    </div>
  );
}
