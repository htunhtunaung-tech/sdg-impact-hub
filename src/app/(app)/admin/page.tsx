import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CircleCheck, Clock, Download, Flag, FolderOpen, Hourglass, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatInt, formatNumber, toNumber } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { GoalBars } from "@/components/impact/goal-bars";
import { HoursBarChart } from "@/components/charts/lazy";
import { hoursByGoal, metricTotals, monthlyHours, peopleReached } from "@/server/queries/impact";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverview() {
  const monthAgo = new Date(Date.now() - 30 * 86400_000);
  const [users, newUsers, projects, pendingProjects, orgs, pendingOrgs, openReports, pendingImpact, hours, people, byGoal, monthly, totals, verifiedRate] = await Promise.all([
    db.user.count(), db.user.count({ where: { createdAt: { gte: monthAgo } } }),
    db.project.count({ where: { moderationStatus: "APPROVED" } }), db.project.count({ where: { moderationStatus: "PENDING_REVIEW" } }),
    db.organization.count({ where: { verificationStatus: "VERIFIED" } }), db.organization.count({ where: { verificationStatus: "PENDING" } }),
    db.report.count({ where: { status: "OPEN" } }), db.impactSubmission.count({ where: { status: "PENDING" } }),
    db.impactSubmission.aggregate({ where: { status: "VERIFIED" }, _sum: { hours: true } }),
    peopleReached({ status: "VERIFIED" }), hoursByGoal({ status: "VERIFIED" }), monthlyHours({}, 12), metricTotals({ status: "VERIFIED" }),
    db.impactSubmission.groupBy({ by: ["status"], _count: true }),
  ]);
  const reviewed = verifiedRate.filter((r) => r.status !== "PENDING").reduce((s, r) => s + r._count, 0);
  const verified = verifiedRate.find((r) => r.status === "VERIFIED")?._count ?? 0;
  const queue = [
    { href: "/admin/projects", label: "Projects awaiting review", n: pendingProjects, icon: FolderOpen },
    { href: "/admin/impact", label: "Contributions to verify", n: pendingImpact, icon: Hourglass },
    { href: "/admin/organizations", label: "Organizations to verify", n: pendingOrgs, icon: Building2 },
    { href: "/admin/reports", label: "Open content reports", n: openReports, icon: Flag },
  ];
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat tone="mint" icon={<Users />} label="Members" value={formatInt(users)} sub={`+${newUsers} in 30 days`} trend={newUsers ? "up" : null} />
        <Stat tone="sky" icon={<FolderOpen />} label="Live projects" value={projects} sub={`${orgs} verified organizations`} />
        <Stat tone="sun" icon={<Clock />} label="Verified hours" value={formatNumber(toNumber(hours._sum.hours))} sub={`${formatInt(people)} people reached`} />
        <Stat tone="lilac" icon={<CircleCheck />} label="Verification rate" value={reviewed ? `${Math.round((verified / reviewed) * 100)}%` : "—"} sub="of reviewed submissions" />
      </section>
      <Card>
        <CardHeader><div><CardTitle>Moderation queue</CardTitle><CardDescription>Items waiting for an administrator.</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {queue.map(({ href, label, n, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-[16px] border p-4 hover:bg-canvas ${n ? "border-amber-200 bg-warning-soft/50" : "border-border"}`}>
              <Icon className={`size-6 ${n ? "text-warning" : "text-ink-subtle"}`} />
              <span><span className="block text-2xl font-bold">{n}</span><span className="text-sm text-ink-muted">{label}</span></span>
            </Link>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><div><CardTitle>Platform hours per month</CardTitle><CardDescription>Verified vs. self-reported (pending)</CardDescription></div></CardHeader>
          <CardContent><HoursBarChart data={monthly} height={280} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Verified hours by goal</CardTitle></div></CardHeader>
          <CardContent><GoalBars rows={byGoal.slice(0, 7)} showShare /></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div><CardTitle>Measured outcomes</CardTitle><CardDescription>Verified totals across the platform</CardDescription></div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild><a href="/api/admin/report?type=impact"><Download /> Impact report</a></Button>
            <Button size="sm" variant="secondary" asChild><a href="/api/admin/report?type=projects"><Download /> Projects report</a></Button>
            <Button size="sm" variant="secondary" asChild><a href="/api/admin/report?type=users"><Download /> Members report</a></Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {totals.map((t) => (
            <div key={t.key} className="rounded-[16px] bg-canvas p-4">
              <p className="text-xl font-bold">{formatNumber(t.value, 0)} <span className="text-sm font-normal text-ink-muted">{t.unit}</span></p>
              <p className="text-xs text-ink-muted">{t.name}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
