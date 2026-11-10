import type { Metadata } from "next";
import { CircleCheck, Flame, Hourglass, Info, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { periodKeyFor, XP } from "@/lib/gamification";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { SdgLabel } from "@/components/sdg/sdg-badge";
import { CompleteChallenge } from "./complete-challenge";

export const metadata: Metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await requireUser("/challenges");
  const now = new Date();
  const [challenges, completedTotal] = await Promise.all([
    db.challenge.findMany({ where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } }, include: { metric: true, _count: { select: { participations: { where: { status: "COMPLETED" } } } } }, orderBy: [{ frequency: "asc" }, { xpReward: "asc" }] }),
    db.challengeParticipation.count({ where: { userId: user.id, status: "COMPLETED" } }),
  ]);
  const mine = await db.challengeParticipation.findMany({
    where: { userId: user.id, OR: challenges.map((c) => ({ challengeId: c.id, periodKey: periodKeyFor(c.frequency, now) })) },
  });
  const groups = [
    { key: "DAILY", title: "Daily challenges", sub: "Small habits, once a day" },
    { key: "WEEKLY", title: "Weekly challenges", sub: "Bigger actions, once a week" },
    { key: "ONE_TIME", title: "Milestone challenges", sub: "Do these once" },
  ] as const;
  return (
    <div className="container-page max-w-5xl py-6 sm:py-8">
      <PageHeader title="Challenges" description="Build sustainable habits. Rewards favour real, verifiable action over volume." />
      <div className="reveal-group mb-8 grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 pt-5"><Flame className="size-8 text-orange-600" /><div><p className="text-2xl font-bold">{user.currentStreak} days</p><p className="text-sm text-ink-muted">Current streak · best {user.longestStreak}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 pt-5"><CircleCheck className="size-8 text-accent" /><div><p className="text-2xl font-bold">{completedTotal}</p><p className="text-sm text-ink-muted">Challenges completed</p></div></CardContent></Card>
        <Card><CardContent className="flex items-start gap-3 pt-5 text-sm text-ink-muted"><Info className="mt-0.5 size-5 shrink-0 text-info" /><p>Honour-system challenges earn up to <strong>{XP.dailyChallengeCap} XP a day</strong>. Evidence challenges earn XP only after review.</p></CardContent></Card>
      </div>
      <div className="space-y-10">
        {groups.map((g) => {
          const list = challenges.filter((c) => c.frequency === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key}>
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <p className="mb-4 text-sm text-ink-muted">{g.sub}</p>
              <ul className="reveal-group grid gap-4 md:grid-cols-2">
                {list.map((c) => {
                  const p = mine.find((m) => m.challengeId === c.id);
                  const done = p?.status === "COMPLETED";
                  return (
                    <li key={c.id} className="flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <SdgLabel goal={c.goalId} />
                        <Badge variant={c.requiresEvidence ? "info" : "neutral"}>{c.requiresEvidence ? <><ShieldCheck /> Evidence · {c.xpReward} XP when verified</> : `+${c.xpReward} XP`}</Badge>
                      </div>
                      <h3 className="mt-3 text-[17px] font-semibold">{c.title}</h3>
                      <p className="mt-1 flex-1 text-sm text-ink-muted">{c.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-ink-subtle">{c._count.participations} completions</span>
                        {done ? (
                          c.requiresEvidence ? <Badge variant="warning"><Hourglass /> Submitted for review</Badge> : <Badge variant="success"><CircleCheck /> Done {c.frequency === "DAILY" ? "today" : c.frequency === "WEEKLY" ? "this week" : ""}</Badge>
                        ) : (
                          <CompleteChallenge id={c.id} title={c.title} requiresEvidence={c.requiresEvidence} metric={c.metric ? { name: c.metric.name, unit: c.metric.unit } : null} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
