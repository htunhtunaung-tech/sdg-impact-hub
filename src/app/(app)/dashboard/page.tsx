import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, ArrowUpRight, Award, CalendarDays, Clock, Flame, FolderOpen, Globe, Leaf, Plus, Search, Sparkles, Trophy, TrendingUp, UserRound, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, IconBubble, InsightRow, Progress, Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { SdgLabel, SdgNumber } from "@/components/sdg/sdg-badge";
import { StaticAreaChart, StaticDonut } from "@/components/charts/static";
import { DateTile } from "@/components/volunteer/date-tile";
import { AchievementIcon } from "@/components/impact/achievement-icon";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { levelProgress } from "@/lib/gamification";
import { recommendOpportunities } from "@/lib/recommendations";
import { hoursByGoal, monthlyHours, peopleReached } from "@/server/queries/impact";
import { sdg } from "@/lib/sdg";
import { formatDate, formatInt, formatNumber, formatTimeRange, timeAgo, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Bangkok" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  if (user.profile && !user.profile.onboardedAt) redirect("/onboarding");
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1)); // trailing 12 months
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const verified = { userId: user.id, status: "VERIFIED" as const };

  const [
    hoursAll, hoursMonth, peopleAll, peopleMonth, byGoal, memberships, upcoming, achievements, recs, community,
    followedGoals, pastUnlogged, pendingCount, newMatches, monthly,
  ] = await Promise.all([
    db.impactSubmission.aggregate({ where: { ...verified, date: { gte: yearStart } }, _sum: { hours: true } }),
    db.impactSubmission.aggregate({ where: { ...verified, date: { gte: monthStart } }, _sum: { hours: true } }),
    peopleReached(verified),
    peopleReached({ ...verified, date: { gte: monthStart } }),
    hoursByGoal({ ...verified, date: { gte: yearStart } }),
    db.projectMember.findMany({
      where: { userId: user.id },
      include: {
        project: {
          include: {
            goals: { where: { isPrimary: true } },
            organization: { select: { name: true } },
            opportunities: { where: { startsAt: { gt: now }, status: "OPEN" }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.volunteerApplication.findMany({
      where: { userId: user.id, status: { in: ["APPROVED", "PENDING"] }, opportunity: { startsAt: { gt: now } } },
      include: { opportunity: true },
      orderBy: { opportunity: { startsAt: "asc" } },
      take: 3,
    }),
    db.userAchievement.findMany({ where: { userId: user.id }, include: { achievement: true }, orderBy: { earnedAt: "desc" }, take: 4 }),
    recommendOpportunities(user, 3),
    db.activity.findMany({
      where: { isPublic: true, actor: { status: "ACTIVE" } },
      include: { actor: { select: { name: true, profile: { select: { username: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.userSdgInterest.findMany({ where: { userId: user.id }, select: { goalId: true } }),
    db.volunteerApplication.findMany({
      where: { userId: user.id, status: { in: ["APPROVED", "COMPLETED"] }, opportunity: { endsAt: { lt: now, gt: new Date(now.getTime() - 30 * 86400_000) }, submissions: { none: { userId: user.id } } } },
      include: { opportunity: { select: { id: true, title: true, startsAt: true } } },
      take: 1,
    }),
    db.impactSubmission.count({ where: { userId: user.id, status: "PENDING" } }),
    db.project.count({
      where: { moderationStatus: "APPROVED", status: { in: ["RECRUITING", "ACTIVE"] }, createdAt: { gt: new Date(now.getTime() - 60 * 86400_000) }, members: { none: { userId: user.id } } },
    }),
    monthlyHours({ userId: user.id }, 6),
  ]);

  const goalsContributed = await db.impactSubmission.findMany({ where: verified, distinct: ["goalId"], select: { goalId: true } });
  const activeProjects = memberships.filter((m) => m.project.status === "ACTIVE" || m.project.status === "RECRUITING");
  const lvl = levelProgress(user.xp);
  const firstName = user.name.split(" ")[0];
  const followed = followedGoals.map((f) => f.goalId);

  const nextSteps: { href: string; icon: React.ReactNode; title: string; sub: string }[] = [];
  if (pastUnlogged[0])
    nextSteps.push({
      href: `/impact/new?opportunityId=${pastUnlogged[0].opportunity.id}`,
      icon: <Clock />,
      title: `Log hours for ${pastUnlogged[0].opportunity.title}`,
      sub: `You attended on ${formatDate(pastUnlogged[0].opportunity.startsAt, { weekday: "short", day: "numeric", month: "short" })}`,
    });
  if (!user.profile?.skills.length)
    nextSteps.push({ href: "/settings", icon: <UserRound />, title: "Add your skills to your profile", sub: "Get better project matches" });
  if (!followed.length) nextSteps.push({ href: "/sdgs", icon: <Globe />, title: "Follow the goals you care about", sub: "Personalise your recommendations" });
  if (newMatches > 0)
    nextSteps.push({
      href: "/projects?sort=relevant",
      icon: <Sparkles />,
      title: `${newMatches} new project${newMatches === 1 ? "" : "s"} you could join`,
      sub: followed.length ? followed.slice(0, 2).map((g) => sdg(g).shortTitle).join(" · ") : "Recently published",
    });
  if (pendingCount > 0)
    nextSteps.push({ href: "/impact", icon: <Clock />, title: `${pendingCount} contribution${pendingCount === 1 ? "" : "s"} awaiting verification`, sub: "Add evidence to speed up review" });
  nextSteps.push({ href: "/challenges", icon: <Flame />, title: "Take today's challenge", sub: user.currentStreak ? `${user.currentStreak}-day streak — keep it going` : "Start a streak" });

  const thisMonth = monthly.at(-1)?.verified ?? 0;
  const lastMonth = monthly.at(-2)?.verified ?? 0;
  const monthDelta = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const totalHours = toNumber(hoursAll._sum.hours);
  const top = byGoal.slice(0, 4);
  const rest = byGoal.slice(4).reduce((s, r) => s + r.hours, 0);
  const donut = [
    ...top.map((r) => ({ key: String(r.goal), label: sdg(r.goal).shortTitle, value: r.hours, color: sdg(r.goal).color })),
    ...(rest > 0 ? [{ key: "other", label: "Other goals", value: Math.round(rest * 10) / 10, color: "#CBD5D0" }] : []),
  ];

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-ink-muted">{formatDate(now, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-ink-muted">Here's the difference you're making this year.</p>
        </div>
        <div className="hidden gap-3 lg:flex">
          <Button variant="secondary" size="lg" asChild>
            <Link href="/projects">
              <Search /> Find a project
            </Link>
          </Button>
          <Button size="lg" asChild>
            <Link href="/impact/new">
              <Plus /> Record Your Impact
            </Link>
          </Button>
        </div>
      </div>

      {/* Hero impact card (eco style) */}
      <section aria-label="This month" className="relative mb-4 overflow-hidden rounded-[var(--radius-xl)] bg-[image:var(--gradient-brand)] p-5 text-white sm:mb-6 sm:p-7">
        <span className="absolute -right-10 -top-16 size-56 rounded-full bg-white/[0.07]" aria-hidden />
        <span className="absolute -bottom-20 right-24 size-40 rounded-full bg-white/[0.06]" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-50">Your verified impact this month</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-[44px] font-bold leading-none tracking-tight sm:text-[52px]">{formatNumber(thisMonth)}</span>
              <span className="text-lg font-semibold text-emerald-50">hours</span>
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
              {monthDelta === null ? (
                <>
                  <Leaf className="size-3.5" aria-hidden /> {formatNumber(totalHours)} hours in the last 12 months
                </>
              ) : monthDelta >= 0 ? (
                <>
                  <TrendingUp className="size-3.5" aria-hidden /> {monthDelta}% more than last month
                </>
              ) : (
                <>
                  <CalendarDays className="size-3.5" aria-hidden /> {formatNumber(lastMonth)} hours last month — keep going
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Button variant="white" size="lg" asChild className="flex-1 sm:flex-none">
              <Link href="/impact/new">
                <Plus /> Record Your Impact
              </Link>
            </Button>
            <Link href="/impact" className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/10 sm:h-auto sm:flex-none sm:ring-0">
              View analytics <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* KPI tiles */}
      <section aria-label="Your impact at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat tone="mint" icon={<Clock />} label="Volunteer hours" value={formatNumber(totalHours)} trend={toNumber(hoursMonth._sum.hours) > 0 ? "up" : null}
          sub={toNumber(hoursMonth._sum.hours) > 0 ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />+{formatNumber(toNumber(hoursMonth._sum.hours))} this month</span> : "Verified, last 12 months"} />
        <Stat tone="sky" icon={<FolderOpen />} label="Projects joined" value={memberships.length} sub={`${activeProjects.length} active now`} />
        <Stat tone="sun" icon={<Users />} label="People reached" value={formatInt(peopleAll)} trend={peopleMonth > 0 ? "up" : null}
          sub={peopleMonth > 0 ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />+{formatInt(peopleMonth)} this month</span> : "From verified activities"} />
        <Stat tone="lilac" icon={<Globe />} label="Goals contributed" value={`${goalsContributed.length} of 17`} sub={byGoal[0] ? `Most active: ${sdg(byGoal[0].goal).shortTitle}` : "Record impact to get started"} />
      </section>

      {/* Trend + donut */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Monthly progress</CardTitle>
              <CardDescription>Verified volunteer hours, last 6 months</CardDescription>
            </div>
            <Link href="/impact" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              Details <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-8">
            <StaticAreaChart data={monthly} height={250} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Your SDG contribution</CardTitle>
              <CardDescription>Share of verified hours by goal</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {donut.length ? (
              <StaticDonut data={donut} centerLabel="verified" size={180} />
            ) : (
              <EmptyState icon={<Clock />} title="No verified hours yet" description="Join an opportunity and record your impact. Once an organizer verifies it, it shows up here." action={<Button asChild><Link href="/volunteer">Find an opportunity</Link></Button>} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights + projects */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>What to do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-3">
            {nextSteps.slice(0, 4).map((s) => (
              <InsightRow key={s.title} href={s.href} icon={s.icon} title={s.title} sub={s.sub} />
            ))}
            <Button variant="secondary" className="mt-3 w-full" asChild>
              <Link href="/assistant">
                <Sparkles /> Ask the AI assistant
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
            <Link href="/projects?view=mine" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              View all <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {activeProjects.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeProjects.slice(0, 2).map(({ project: p }) => {
                  const goal = p.goals[0]?.goalId ?? 17;
                  const next = p.opportunities[0]?.startsAt;
                  const g = sdg(goal);
                  return (
                    <Link key={p.id} href={`/projects/${p.slug}`} className="group flex flex-col rounded-[18px] p-4 transition-shadow hover:shadow-raised" style={{ background: `color-mix(in srgb, ${g.color} 9%, white)` }}>
                      <SdgLabel goal={goal} short={false} className="text-ink-muted" />
                      <span className="mt-2 text-[17px] font-semibold leading-snug group-hover:underline">{p.title}</span>
                      <span className="mt-auto pt-5 text-sm text-ink-muted">{p.organization?.name ?? "Independent project"}</span>
                      <span className="mt-3 flex justify-between text-sm">
                        <span>Project progress</span>
                        <span className="font-semibold">{p.progress}%</span>
                      </span>
                      <Progress value={p.progress} className="mt-1.5 bg-white" color={g.color} label={`${p.title} progress`} />
                      <span className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
                        <CalendarDays className="size-4" />
                        {next ? `Next: ${formatDate(next, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}` : p.scheduleText ?? "No session scheduled"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<FolderOpen />} title="You haven't joined a project yet" description="Projects are longer-term teams working on a goal together." action={<Button asChild><Link href="/projects">Browse projects</Link></Button>} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended + upcoming + level */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recommended for you</CardTitle>
              <CardDescription>Matched on the goals you follow, your skills and your location</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {recs.length ? (
              <ul className="space-y-3">
                {recs.map((o) => (
                  <li key={o.id}>
                    <Link href={`/volunteer/${o.id}`} className="flex items-center gap-4 rounded-[18px] bg-canvas p-3 transition-colors hover:bg-tone-mint">
                      <DateTile date={o.startsAt} className="bg-surface" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><SdgNumber goal={o.goalId} size={20} /><span className="truncate font-semibold">{o.title}</span></span>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{o.organization?.name ?? "Community"} · {o.isOnline ? "Online" : o.locationName}</span>
                        {o.reasons.length > 0 && <span className="mt-1 block truncate text-xs font-medium text-link">{o.reasons.slice(0, 2).join(" · ")}</span>}
                      </span>
                      <span className="hidden shrink-0 rounded-full bg-surface px-3 py-1 text-[13px] font-medium text-ink-muted sm:block">{o.spotsLeft > 0 ? `${o.spotsLeft} spots left` : "Waitlist"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No open opportunities right now. Check back soon.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <Link href="/volunteer?tab=schedule" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
                Calendar <ArrowRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {upcoming.length ? (
                <ul className="space-y-3">
                  {upcoming.map((a) => (
                    <li key={a.id}>
                      <Link href={`/volunteer/${a.opportunity.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
                        <DateTile date={a.opportunity.startsAt} />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold">{a.opportunity.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-ink-muted">
                            <Clock className="size-3.5 shrink-0" /> <span className="truncate">{formatTimeRange(a.opportunity.startsAt, a.opportunity.endsAt)} · {a.opportunity.isOnline ? "Online" : a.opportunity.locationName}</span>
                          </span>
                          {a.status === "PENDING" && <Badge variant="warning" className="mt-1">Awaiting approval</Badge>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-ink-muted">Nothing scheduled. <Link href="/volunteer" className="font-semibold text-link hover:underline">Find an opportunity</Link></p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Level {lvl.level}</CardTitle>
                <CardDescription>{formatInt(user.xp)} XP · from verified impact</CardDescription>
              </div>
              <IconBubble className="bg-tone-sun text-amber-800"><Trophy /></IconBubble>
            </CardHeader>
            <CardContent>
              <Progress value={lvl.pct} label="Progress to next level" />
              <p className="mt-2 text-xs text-ink-muted">{formatInt(lvl.needed - lvl.current)} XP to level {lvl.level + 1}</p>
              <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-tone-rose p-3">
                <Flame className="size-6 text-orange-700" aria-hidden />
                <div className="text-sm">
                  <p className="font-semibold">{user.currentStreak}-day streak</p>
                  <p className="text-ink-muted">Best: {user.longestStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Achievements + community */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent achievements</CardTitle>
            <Link href="/profile#badges" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              See all badges <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {achievements.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-[16px] bg-canvas p-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-white">
                      <AchievementIcon icon={a.achievement.icon} className="size-5" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold">{a.achievement.name}</span>
                      <span className="block text-[13px] text-ink-muted">Earned {formatDate(a.earnedAt, { day: "numeric", month: "short" })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-ink-muted"><Award className="size-4" /> Badges are earned from verified contributions — your first one is close.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Community activity</CardTitle>
            <Link href="/community" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              Feed <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {community.slice(0, 4).map((a) => (
                <li key={a.id} className="text-[13px] leading-snug text-ink-muted">
                  <span className="font-semibold text-ink">{a.actor.name}</span>{" "}
                  {a.link ? <Link href={a.link} className="hover:underline">{a.message}</Link> : a.message}
                  <span className="text-ink-subtle"> · {timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
