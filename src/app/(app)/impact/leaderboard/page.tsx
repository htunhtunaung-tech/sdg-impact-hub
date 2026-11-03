import type { Metadata } from "next";
import Link from "next/link";
import { Medal, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { levelForXp } from "@/lib/gamification";
import { formatNumber } from "@/lib/utils";
import { SDGS } from "@/lib/sdg";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { GoalFilter } from "./goal-filter";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; goal?: string }> }) {
  const user = await requireUser("/impact/leaderboard");
  const sp = await searchParams;
  const period = sp.period === "month" ? "month" : sp.period === "all" ? "all" : "year";
  const goal = Number(sp.goal) || 0;
  const now = new Date();
  const since = period === "month" ? new Date(now.getTime() - 30 * 86400_000) : period === "year" ? new Date(now.getTime() - 365 * 86400_000) : new Date(0);

  // Ranked by VERIFIED hours only — volume of self-reports never counts.
  const rows = await db.$queryRaw<{ userId: string; hours: number; entries: bigint; goals: bigint }[]>`
    SELECT s."userId", SUM(s.hours)::float AS hours, COUNT(*) AS entries, COUNT(DISTINCT s."goalId") AS goals
    FROM "ImpactSubmission" s
    JOIN "UserProfile" p ON p."userId" = s."userId" AND p."showOnLeaderboard" = true AND p."isPublic" = true
    JOIN "User" u ON u.id = s."userId" AND u.status = 'ACTIVE'
    WHERE s.status = 'VERIFIED' AND s.date >= ${since} AND (${goal} = 0 OR s."goalId" = ${goal})
    GROUP BY s."userId" ORDER BY hours DESC LIMIT 50`;
  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, name: true, image: true, xp: true, profile: { select: { username: true, city: true } } } });
  const byId = new Map(users.map((u) => [u.id, u]));
  const q = (p: string) => `/impact/leaderboard?period=${p}${goal ? `&goal=${goal}` : ""}`;

  return (
    <div className="container-page max-w-4xl py-6 sm:py-8">
      <PageHeader title="Community leaderboard" description="Celebrating verified volunteer hours. Self-reported hours aren't counted." actions={<GoalFilter value={goal} goals={SDGS.map((g) => ({ id: g.id, title: g.shortTitle }))} />} />
      <LinkTabs className="mb-6" active={period} tabs={[{ key: "month", label: "Last 30 days", href: q("month") }, { key: "year", label: "Last 12 months", href: q("year") }, { key: "all", label: "All time", href: q("all") }]} />
      <Card className="overflow-hidden">
        {rows.length ? (
          <ol className="divide-y divide-border">
            {rows.map((r, i) => {
              const u = byId.get(r.userId);
              if (!u) return null;
              const me = u.id === user.id;
              return (
                <li key={r.userId} className={`flex items-center gap-4 px-4 py-3 sm:px-6 ${me ? "bg-mint" : ""}`}>
                  <span className="w-8 text-center text-lg font-bold tabular-nums text-ink-muted">
                    {i < 3 ? <Medal className={`mx-auto size-6 ${["text-amber-500", "text-slate-400", "text-orange-700"][i]}`} aria-label={`Rank ${i + 1}`} /> : i + 1}
                  </span>
                  <Avatar name={u.name} src={u.image} size={40} />
                  <div className="min-w-0 flex-1">
                    {u.profile ? <Link href={`/u/${u.profile.username}`} className="font-semibold hover:underline">{u.name}{me && " (you)"}</Link> : u.name}
                    <p className="text-sm text-ink-muted">Level {levelForXp(u.xp)} · {Number(r.goals)} goal{Number(r.goals) === 1 ? "" : "s"}{u.profile?.city ? ` · ${u.profile.city}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{formatNumber(r.hours)} h</p>
                    <p className="inline-flex items-center gap-1 text-xs text-link"><ShieldCheck className="size-3" /> {String(r.entries)} verified</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : <p className="p-8 text-center text-ink-muted">No verified hours for this period yet.</p>}
      </Card>
      <p className="mt-4 text-xs text-ink-subtle">Only members who chose to appear on leaderboards are shown. You can change this in Settings → Privacy.</p>
    </div>
  );
}
