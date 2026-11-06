import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, FolderOpen, Globe, Link2, Lock, MapPin, MessageSquare, Pencil, ShieldCheck, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { levelProgress } from "@/lib/gamification";
import { formatDate, formatInt, formatNumber, timeAgo, toNumber } from "@/lib/utils";
import { Avatar, Progress, Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { GoalBars } from "@/components/impact/goal-bars";
import { AchievementIcon } from "@/components/impact/achievement-icon";
import { hoursByGoal } from "@/server/queries/impact";
import { ReportUserButton } from "./report-user";

type Props = { params: Promise<{ username: string }> };
const ROLE: Record<string, string> = { INDIVIDUAL: "Member", STUDENT: "Student", VOLUNTEER: "Volunteer", ORGANIZER: "Project organizer", ORGANIZATION: "Organization", ADMIN: "Administrator" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.userProfile.findUnique({ where: { username: (await params).username }, include: { user: { select: { name: true } } } });
  return { title: p?.isPublic ? p.user.name : "Profile" };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const profile = await db.userProfile.findUnique({ where: { username: username.toLowerCase() }, include: { user: true } });
  if (!profile || profile.user.status !== "ACTIVE") notFound();
  const u = profile.user;
  const isMe = viewer?.id === u.id;
  const canSee = profile.isPublic || isMe || viewer?.role === "ADMIN";

  if (!canSee) {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <Avatar name={u.name} size={80} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold">{u.name}</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 text-ink-muted"><Lock className="size-4" /> This profile is private.</p>
      </div>
    );
  }

  const verified = { userId: u.id, status: "VERIFIED" as const };
  const [hours, byGoal, achievements, allAchievements, memberships, goals, activity, pending] = await Promise.all([
    db.impactSubmission.aggregate({ where: verified, _sum: { hours: true }, _count: true }),
    hoursByGoal(verified),
    db.userAchievement.findMany({ where: { userId: u.id }, include: { achievement: true }, orderBy: { earnedAt: "desc" } }),
    db.achievement.findMany({ orderBy: { threshold: "asc" } }),
    db.projectMember.findMany({ where: { userId: u.id, project: { moderationStatus: "APPROVED" } }, include: { project: { include: { goals: { where: { isPrimary: true } } } } }, orderBy: { createdAt: "desc" } }),
    db.userSdgInterest.findMany({ where: { userId: u.id }, orderBy: { goalId: "asc" } }),
    db.activity.findMany({ where: { actorId: u.id, isPublic: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    isMe ? db.impactSubmission.aggregate({ where: { userId: u.id, status: "PENDING" }, _sum: { hours: true } }) : null,
  ]);
  const lvl = levelProgress(u.xp);
  const earned = new Set(achievements.map((a) => a.achievementId));

  return (
    <div className="container-page py-6 sm:py-8">
      <section className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-card">
        <div className="h-28 bg-gradient-to-r from-forest-900 via-emerald-700 to-emerald-500 sm:h-36" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Avatar name={u.name} src={u.image} size={96} className="border-4 border-surface text-3xl" />
            <div className="flex gap-2">
              {isMe ? (
                <Button variant="secondary" asChild><Link href="/settings"><Pencil /> Edit profile</Link></Button>
              ) : viewer ? (
                <>
                  <Button asChild><Link href={`/messages?with=${u.id}`}><MessageSquare /> Message</Link></Button>
                  <ReportUserButton userId={u.id} />
                </>
              ) : null}
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{u.name}</h1>
          <p className="text-ink-muted">@{profile.username} · {ROLE[u.role]} · Level {lvl.level}</p>
          {profile.headline && <p className="mt-2 text-[17px]">{profile.headline}</p>}
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {profile.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{[profile.city, profile.country].filter(Boolean).join(", ")}</span>}
            {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-link hover:underline"><Link2 className="size-4" />{profile.website.replace(/^https?:\/\//, "")}</a>}
            <span>Joined {formatDate(u.createdAt, { month: "long", year: "numeric" })}</span>
          </p>
          {profile.bio && <p className="mt-4 max-w-3xl leading-relaxed text-slate-700">{profile.bio}</p>}
          {profile.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{profile.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat tone="mint" icon={<Clock />} label="Verified hours" value={formatNumber(toNumber(hours._sum.hours))} sub={isMe && pending && toNumber(pending._sum.hours) > 0 ? `+${formatNumber(toNumber(pending._sum.hours))} h awaiting verification` : `${hours._count} verified activities`} />
        <Stat tone="sky" icon={<FolderOpen />} label="Projects" value={memberships.length} />
        <Stat tone="sun" icon={<Globe />} label="Goals contributed" value={byGoal.length} />
        <Stat tone="lilac" icon={<Trophy />} label="Experience" value={formatInt(u.xp)} sub={<span className="block"><Progress value={lvl.pct} className="mt-1 h-1.5" label="Level progress" /></span>} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card id="badges">
            <CardHeader><CardTitle>Badges</CardTitle><span className="text-sm text-ink-muted">{achievements.length} of {allAchievements.length}</span></CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allAchievements.map((a) => {
                  const got = earned.has(a.id);
                  const when = achievements.find((x) => x.achievementId === a.id)?.earnedAt;
                  return (
                    <li key={a.id} className={`flex items-center gap-3 rounded-[16px] border p-3 ${got ? "border-emerald-200 bg-mint/50" : "border-dashed border-border opacity-60"}`}>
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${got ? "bg-primary text-white" : "bg-slate-100 text-ink-subtle"}`}><AchievementIcon icon={a.icon} className="size-5" /></span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">{a.name}</span>
                        <span className="block text-xs text-ink-muted">{got && when ? `Earned ${formatDate(when, { day: "numeric", month: "short", year: "numeric" })}` : a.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle"><ShieldCheck className="size-3.5" /> Badges are based on verified contributions only.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
            <CardContent>
              {memberships.length ? (
                <ul className="divide-y divide-border">
                  {memberships.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <SdgNumber goal={m.project.goals[0]?.goalId ?? 17} size={28} />
                      <Link href={`/projects/${m.project.slug}`} className="flex-1 font-medium hover:underline">{m.project.title}</Link>
                      <Badge variant={m.role === "ORGANIZER" ? "brand" : "neutral"}>{m.role.toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-muted">Not part of any projects yet.</p>}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contribution by goal</CardTitle></CardHeader>
            <CardContent>{byGoal.length ? <GoalBars rows={byGoal.slice(0, 5)} showShare /> : <p className="text-sm text-ink-muted">No verified contributions yet.</p>}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Follows</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {goals.length ? goals.map((g) => <Link key={g.goalId} href={`/sdgs/${g.goalId}`} aria-label={`Goal ${g.goalId}`}><SdgNumber goal={g.goalId} size={36} /></Link>) : <p className="text-sm text-ink-muted">No goals followed yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm">
                {activity.map((a) => <li key={a.id} className="text-ink-muted">{u.name.split(" ")[0]} {a.message} <span className="text-ink-subtle">· {timeAgo(a.createdAt)}</span></li>)}
                {!activity.length && <li className="text-ink-muted">No public activity yet.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
