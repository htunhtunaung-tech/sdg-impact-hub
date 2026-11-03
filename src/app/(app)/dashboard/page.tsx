import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Award, CalendarDays, ChevronRight, Clock, Flame, FolderOpen, Globe, Plus, Search, Sparkles, Trophy, TrendingUp, UserRound, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, IconBubble, Progress, Stat } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { SdgLabel, SdgNumber } from "@/components/sdg/sdg-badge";
import { GoalBars } from "@/components/impact/goal-bars";
import { DateTile } from "@/components/volunteer/date-tile";
import { AchievementIcon } from "@/components/impact/achievement-icon";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { levelProgress } from "@/lib/gamification";
import { recommendOpportunities } from "@/lib/recommendations";
import { hoursByGoal, peopleReached } from "@/server/queries/impact";
import { sdg } from "@/lib/sdg";
import { formatDate, formatInt, formatNumber, formatTimeRange, timeAgo, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Bangkok" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1)); // trailing 12 months
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const verified = { userId: user.id, status: "VERIFIED" as const };

  const [
    hoursAll, hoursMonth, peopleAll, peopleMonth, byGoal, memberships, upcoming, achievements, recs, community,
    followedGoals, pastUnlogged, pendingCount, newMatches,
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

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-ink-muted">Here's the difference you're making this year.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" asChild className="hidden sm:inline-flex">
            <Link href="/projects">
              <Search /> Find a project
            </Link>
          </Button>
          <Button size="lg" asChild className="flex-1 sm:flex-none">
            <Link href="/impact/new">
              <Plus /> Record Your Impact
            </Link>
          </Button>
        </div>
      </div>

      <section aria-label="Your impact at a glance" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat icon={<Clock />} label="Volunteer hours" value={formatNumber(toNumber(hoursAll._sum.hours))} trend="up"
          sub={toNumber(hoursMonth._sum.hours) > 0 ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />+{formatNumber(toNumber(hoursMonth._sum.hours))} this month</span> : "Verified, last 12 months"} />
        <Stat icon={<FolderOpen />} label="Projects joined" value={memberships.length} sub={`${activeProjects.length} active now`} />
        <Stat icon={<Users />} label="People reached" value={formatInt(peopleAll)} trend={peopleMonth > 0 ? "up" : null}
          sub={peopleMonth > 0 ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />+{formatInt(peopleMonth)} this month</span> : "From verified activities"} />
        <Stat icon={<Globe />} label="Goals contributed" value={`${goalsContributed.length} of 17`} sub={byGoal[0] ? `Most active: ${sdg(byGoal[0].goal).shortTitle}` : "Record impact to get started"} />
      </section>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Your SDG contribution</CardTitle>
              <CardDescription>Verified hours by goal, last 12 months</CardDescription>
            </div>
            <Link href="/impact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              View analytics <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="pt-6">
            {byGoal.length ? (
              <GoalBars rows={byGoal.slice(0, 5)} />
            ) : (
              <EmptyState icon={<Clock />} title="No verified hours yet" description="Join an opportunity and record your impact. Once an organizer verifies it, it shows up here." action={<Button asChild><Link href="/volunteer">Find an opportunity</Link></Button>} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What to do next</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-border">
              {nextSteps.slice(0, 3).map((s) => (
                <li key={s.title}>
                  <Link href={s.href} className="group flex items-center gap-3 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-link [&_svg]:size-5">{s.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink group-hover:underline">{s.title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{s.sub}</span>
                    </span>
                    <ChevronRight className="size-4 text-ink-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="mt-2 w-full" asChild>
              <Link href="/assistant">See all suggestions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Active projects</CardTitle>
            <Link href="/projects?view=mine" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              View all projects <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {activeProjects.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeProjects.slice(0, 2).map(({ project: p }) => {
                  const goal = p.goals[0]?.goalId ?? 17;
                  const next = p.opportunities[0]?.startsAt;
                  return (
                    <Link key={p.id} href={`/projects/${p.slug}`} className="flex flex-col rounded-[12px] border border-border p-4 transition-colors hover:border-border-strong hover:bg-canvas">
                      <SdgLabel goal={goal} short={false} />
                      <span className="mt-2 text-[17px] font-semibold leading-snug">{p.title}</span>
                      <span className="mt-auto pt-5 text-sm text-ink-muted">{p.organization?.name ?? "Independent project"}</span>
                      <span className="mt-3 flex justify-between text-sm">
                        <span>Project progress</span>
                        <span className="font-semibold">{p.progress}%</span>
                      </span>
                      <Progress value={p.progress} className="mt-1.5" label={`${p.title} progress`} />
                      <span className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-sm text-ink-muted">
                        <CalendarDays className="size-4" />
                        {next ? `Next session: ${formatDate(next, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}` : p.scheduleText ?? "No session scheduled"}
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

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <Link href="/volunteer?tab=schedule" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
              Calendar <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ul className="divide-y divide-border">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/volunteer/${a.opportunity.id}`} className="flex min-w-0 items-center gap-4 py-3 hover:opacity-90">
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
              <p className="py-6 text-center text-sm text-ink-muted">Nothing scheduled. <Link href="/volunteer" className="font-semibold text-link hover:underline">Find an opportunity</Link></p>
            )}
          </CardContent>
        </Card>
      </div>

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
                    <Link href={`/volunteer/${o.id}`} className="flex items-center gap-4 rounded-[12px] border border-border p-3 transition-colors hover:border-border-strong hover:bg-canvas">
                      <DateTile date={o.startsAt} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><SdgNumber goal={o.goalId} size={20} /><span className="truncate font-semibold">{o.title}</span></span>
                        <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{o.organization?.name ?? "Community"} · {o.isOnline ? "Online" : o.locationName}</span>
                        {o.reasons.length > 0 && <span className="mt-1 block truncate text-xs font-medium text-link">{o.reasons.slice(0, 2).join(" · ")}</span>}
                      </span>
                      <span className="hidden text-sm text-ink-muted sm:block">{o.spotsLeft > 0 ? `${o.spotsLeft} spots left` : "Waitlist"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">No open opportunities right now. Check back soon.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Level {lvl.level}</CardTitle>
              <CardDescription>{formatInt(user.xp)} XP · earned from verified impact</CardDescription>
            </div>
            <IconBubble><Trophy /></IconBubble>
          </CardHeader>
          <CardContent>
            <Progress value={lvl.pct} label="Progress to next level" />
            <p className="mt-2 text-xs text-ink-muted">{formatInt(lvl.needed - lvl.current)} XP to level {lvl.level + 1}</p>
            <div className="mt-5 flex items-center gap-3 rounded-[12px] bg-canvas p-3">
              <Flame className="size-6 text-orange-600" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">{user.currentStreak}-day streak</p>
                <p className="text-ink-muted">Best: {user.longestStreak} days</p>
              </div>
            </div>
            <h3 className="mt-6 text-sm font-semibold">Recent community activity</h3>
            <ul className="mt-2 space-y-2.5">
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

      <Card className="mt-4 sm:mt-6">
        <CardHeader>
          <CardTitle>Recent achievements</CardTitle>
          <Link href="/profile#badges" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
            See all badges <ArrowRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {achievements.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {achievements.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
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
    </div>
  );
}
