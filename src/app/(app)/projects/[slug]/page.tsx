import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays, Check, ChevronRight, CircleCheck, CircleDashed, Clock, Hourglass, MapPin, MessageSquare, Pencil, Plus, ShieldCheck, Sparkles, UserRound, Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canManageProject } from "@/lib/permissions";
import { sdg, sdgTint } from "@/lib/sdg";
import { formatCurrency, formatDate, formatNumber, timeAgo, toNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, EmptyState, Progress } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { SdgLabel } from "@/components/sdg/sdg-badge";
import { SdgIcon } from "@/components/sdg/sdg-icon";
import { SaveProjectButton } from "@/components/projects/save-button";
import { OpportunityRow } from "@/components/volunteer/opportunity-row";
import { MapView } from "@/components/map/map-view";
import { HoursBarChart } from "@/components/charts/hours-chart";
import { upcomingOpportunityRows } from "@/server/queries/opportunities";
import { metricTotals, monthlyHours } from "@/server/queries/impact";
import { PostCard, postInclude } from "@/components/community/post-card";
import {
  AddMilestoneForm, ApplicationReview, DeleteProjectButton, JoinProjectButton, MemberActions, MilestoneToggle, OpportunityStatusButtons,
  ProjectStatusSelect, ReviewButtons, ShareButton, UpdateComposer,
} from "./project-widgets";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> };

async function load(slug: string) {
  return db.project.findUnique({
    where: { slug },
    include: {
      goals: { orderBy: { isPrimary: "desc" } },
      organization: true,
      organizer: { select: { id: true, name: true, image: true, profile: { select: { username: true } } } },
      milestones: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      impactTargets: { include: { metric: true } },
      members: { include: { user: { select: { id: true, name: true, image: true, profile: { select: { username: true, headline: true } } } } }, orderBy: { createdAt: "asc" } },
      _count: { select: { posts: { where: { type: "PROJECT_UPDATE", isHidden: false } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await db.project.findUnique({ where: { slug: (await params).slug }, select: { title: true, summary: true, moderationStatus: true } });
  if (!p || p.moderationStatus !== "APPROVED") return { title: "Project" };
  return { title: p.title, description: p.summary };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const [{ slug }, { tab: tabParam }] = await Promise.all([params, searchParams]);
  const project = await load(slug);
  if (!project) notFound();
  const user = await getCurrentUser();
  const canManage = await canManageProject(user, project.id);
  if (project.moderationStatus !== "APPROVED" && !canManage) notFound();

  const tabs = ["overview", "impact", "updates", "team", ...(canManage ? ["manage"] : [])];
  const tab = tabs.includes(tabParam ?? "") ? tabParam! : "overview";
  const primary = project.goals[0]?.goalId ?? 17;
  const g = sdg(primary);
  const volunteers = project.members.filter((m) => m.role === "VOLUNTEER").length;
  const spotsLeft = Math.max(project.volunteersNeeded - volunteers, 0);
  const myMembership = user ? project.members.find((m) => m.userId === user.id) : undefined;
  const verifiedWhere = { projectId: project.id, status: "VERIFIED" as const };

  const [opps, totals, verifiedHours, pendingHours] = await Promise.all([
    upcomingOpportunityRows({ projectId: project.id }, user?.id, 4),
    metricTotals(verifiedWhere),
    db.impactSubmission.aggregate({ where: verifiedWhere, _sum: { hours: true }, _count: true }),
    db.impactSubmission.aggregate({ where: { projectId: project.id, status: "PENDING" }, _sum: { hours: true }, _count: true }),
  ]);

  const tabHref = (t: string) => `/projects/${slug}${t === "overview" ? "" : `?tab=${t}`}`;
  const dateRange =
    project.startDate && project.endDate && project.startDate.toDateString() !== project.endDate.toDateString()
      ? `${formatDate(project.startDate, { day: "numeric", month: "short" })} – ${formatDate(project.endDate)}`
      : project.startDate ? formatDate(project.startDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "To be confirmed";

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/projects" className="font-medium text-link hover:underline">Projects</Link>
        <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
        <span className="truncate text-ink-muted">{project.title}</span>
      </nav>

      {project.moderationStatus !== "APPROVED" && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-[12px] border border-amber-200 bg-warning-soft p-4 text-sm text-warning">
          <Hourglass className="mt-0.5 size-4 shrink-0" />
          <span>
            {project.moderationStatus === "PENDING_REVIEW"
              ? "This project is awaiting review by an administrator. Only you and admins can see it."
              : `This project wasn't approved${project.moderationNote ? `: ${project.moderationNote}` : "."} Edit it and contact an administrator to resubmit.`}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0">
          <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] sm:h-64" style={{ background: sdgTint(g.color, 0.16) }}>
            {project.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={project.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <SdgIcon goal={primary} className="size-20" strokeWidth={1.5} style={{ color: g.color }} />
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {project.goals.map((pg) => <SdgLabel key={pg.goalId} goal={pg.goalId} short={false} link />)}
          </div>
          <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[36px]">{project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {project.organization ? (
              <Link href={`/organizations/${project.organization.slug}`} className="flex items-center gap-2 font-semibold hover:underline">
                <Avatar name={project.organization.name} src={project.organization.logoUrl} size={28} className="bg-sky-50 text-info" />
                {project.organization.name}
              </Link>
            ) : (
              <Link href={project.organizer.profile ? `/u/${project.organizer.profile.username}` : "#"} className="flex items-center gap-2 font-semibold hover:underline">
                <Avatar name={project.organizer.name} src={project.organizer.image} size={28} /> {project.organizer.name}
              </Link>
            )}
            {project.organization?.verificationStatus === "VERIFIED" && (
              <Badge variant="success"><CircleCheck /> Verified organizer</Badge>
            )}
            <Badge variant="outline">{project.status.charAt(0) + project.status.slice(1).toLowerCase()}</Badge>
          </div>

          <LinkTabs
            className="mt-6"
            active={tab}
            tabs={[
              { key: "overview", label: "Overview", href: tabHref("overview") },
              { key: "impact", label: "Impact", href: tabHref("impact") },
              { key: "updates", label: `Updates (${project._count.posts})`, href: tabHref("updates") },
              { key: "team", label: `Team (${project.members.length})`, href: tabHref("team") },
              ...(canManage ? [{ key: "manage", label: "Manage", href: tabHref("manage") }] : []),
            ]}
          />

          <div className="mt-6">
            {tab === "overview" && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold">About this project</h2>
                  <div className="mt-2 max-w-[68ch] space-y-3 text-[16px] leading-relaxed text-slate-700">
                    {project.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
                  </div>
                </section>
                {project.tasks.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold">What you&apos;ll do</h2>
                    <ul className="mt-3 space-y-3">
                      {project.tasks.map((t) => (
                        <li key={t} className="flex items-center gap-3 text-[16px] text-slate-700">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-mint text-link"><Check className="size-3.5" /></span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {project.objectives.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold">Objectives</h2>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] text-slate-700 marker:text-ink-subtle">
                      {project.objectives.map((o) => <li key={o}>{o}</li>)}
                    </ul>
                  </section>
                )}
                {project.impactTargets.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold">Expected impact</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {project.impactTargets.map((t) => (
                        <div key={t.id} className="rounded-[12px] border border-border bg-surface p-5">
                          <p className="text-[28px] font-bold text-forest-900">{formatNumber(t.targetValue, 0)}</p>
                          <p className="text-sm text-ink-muted">{t.label ?? `${t.metric.unit} · ${t.metric.name.toLowerCase()}`}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {project.milestones.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold">Milestones</h2>
                    <div className="mt-2 flex items-center gap-3 text-sm text-ink-muted">
                      <Progress value={project.progress} className="max-w-xs" label="Milestone progress" /> {project.progress}% complete
                    </div>
                    <ol className="mt-4 space-y-0">
                      {project.milestones.map((m, i) => (
                        <li key={m.id} className="relative flex gap-3 pb-5">
                          {i < project.milestones.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />}
                          {m.completedAt ? (
                            <CircleCheck className="relative size-6 shrink-0 fill-mint text-accent" aria-label="Completed" />
                          ) : (
                            <CircleDashed className="relative size-6 shrink-0 text-ink-subtle" aria-label="Not started" />
                          )}
                          <div>
                            <p className={m.completedAt ? "font-medium text-ink" : "font-medium text-slate-700"}>{m.title}</p>
                            <p className="text-xs text-ink-muted">
                              {m.completedAt ? `Completed ${formatDate(m.completedAt, { day: "numeric", month: "short" })}` : m.dueDate ? `Due ${formatDate(m.dueDate, { day: "numeric", month: "short", year: "numeric" })}` : "No due date"}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Upcoming sessions</h2>
                    {canManage && <Link href={`/volunteer/new?projectId=${project.id}`} className="text-sm font-semibold text-link hover:underline">+ Add session</Link>}
                  </div>
                  <div className="mt-3 space-y-3">
                    {opps.length ? opps.map((o) => <OpportunityRow key={o.id} o={o} signedIn={Boolean(user)} />) : <p className="text-sm text-ink-muted">No sessions scheduled right now.</p>}
                  </div>
                </section>
              </div>
            )}

            {tab === "impact" && <ImpactTab projectId={project.id} targets={project.impactTargets} totals={totals} verified={verifiedHours} pending={pendingHours} />}
            {tab === "updates" && <UpdatesTab projectId={project.id} canManage={canManage} userId={user?.id} />}
            {tab === "team" && (
              <Card>
                <CardContent className="pt-5">
                  <ul className="divide-y divide-border">
                    {project.members.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                        <Avatar name={m.user.name} src={m.user.image} size={40} />
                        <div className="min-w-0 flex-1">
                          {m.user.profile ? (
                            <Link href={`/u/${m.user.profile.username}`} className="font-semibold hover:underline">{m.user.name}</Link>
                          ) : <span className="font-semibold">{m.user.name}</span>}
                          <p className="truncate text-sm text-ink-muted">{m.user.profile?.headline ?? `Joined ${formatDate(m.createdAt, { month: "short", year: "numeric" })}`}</p>
                        </div>
                        <Badge variant={m.role === "ORGANIZER" ? "brand" : m.role === "COORDINATOR" ? "success" : "neutral"}>{m.role.toLowerCase()}</Badge>
                        {canManage && m.role !== "ORGANIZER" && <MemberActions projectId={project.id} userId={m.userId} role={m.role} />}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {tab === "manage" && canManage && <ManageTab project={project} />}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="shadow-raised">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold">Join this project</h2>
              {project.volunteersNeeded > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold">{volunteers} of {project.volunteersNeeded} volunteers</span>
                    <span className="text-ink-muted">{spotsLeft} spots left</span>
                  </div>
                  <Progress value={(volunteers / project.volunteersNeeded) * 100} label="Volunteer spots filled" />
                </div>
              )}
              <dl className="mt-6 space-y-4 text-[15px]">
                <Detail icon={<CalendarDays />} label="Dates" value={dateRange} />
                {project.scheduleText && <Detail icon={<Clock />} label="Time" value={project.scheduleText} />}
                <Detail icon={<MapPin />} label="Location" value={project.isOnline ? "Online" : (project.locationName && project.city && project.locationName.includes(project.city) ? project.locationName : [project.locationName, project.city].filter(Boolean).join(", ")) || "To be confirmed"} />
                {project.commitment && <Detail icon={<UserRound />} label="Commitment" value={project.commitment} />}
                <Detail icon={<Sparkles />} label="Skills" value={project.skillsNeeded.length ? project.skillsNeeded.join(", ") : "None required, training provided"} />
                {project.fundingGoal && (
                  <Detail
                    icon={<Wallet />}
                    label="Funding"
                    value={
                      <span className="block">
                        {formatCurrency(toNumber(project.fundsRaised), project.currency)} of {formatCurrency(toNumber(project.fundingGoal), project.currency)}
                        <Progress value={(toNumber(project.fundsRaised) / toNumber(project.fundingGoal)) * 100} className="mt-1.5" label="Funding raised" />
                      </span>
                    }
                  />
                )}
              </dl>
              <div className="mt-6 space-y-3">
                <JoinProjectButton
                  projectId={project.id}
                  slug={project.slug}
                  isMember={Boolean(myMembership)}
                  isOrganizer={canManage}
                  signedIn={Boolean(user)}
                  status={project.status}
                  full={project.volunteersNeeded > 0 && spotsLeft === 0}
                />
                {user && <SaveProjectButton projectId={project.id} saved={Boolean(await db.savedProject.findUnique({ where: { userId_projectId: { userId: user.id, projectId: project.id } } }))} />}
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-ink-muted">You can leave a project at any time.</p>
          <div className="flex justify-center"><ShareButton title={project.title} /></div>
          {!project.isOnline && project.latitude != null && project.longitude != null && (
            <Card className="overflow-hidden">
              <MapView points={[{ lat: project.latitude, lng: project.longitude, label: project.locationName ?? project.title, color: g.color }]} className="h-52" zoom={12} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-link [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className="font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

async function ImpactTab({
  projectId, targets, totals, verified, pending,
}: {
  projectId: string;
  targets: { id: string; targetValue: number; label: string | null; metric: { key: string; name: string; unit: string } }[];
  totals: { key: string; name: string; unit: string; value: number }[];
  verified: { _sum: { hours: unknown }; _count: number };
  pending: { _sum: { hours: unknown }; _count: number };
}) {
  const [contributors, monthly] = await Promise.all([
    db.impactSubmission.findMany({ where: { projectId, status: "VERIFIED" }, distinct: ["userId"], select: { userId: true } }),
    monthlyHours({ projectId }, 6),
  ]);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-border bg-surface p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-link"><ShieldCheck className="size-3.5" /> Verified hours</p>
          <p className="mt-1 text-[28px] font-bold">{formatNumber(toNumber(verified._sum.hours))}</p>
          <p className="text-sm text-ink-muted">{verified._count} verified entries</p>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Contributors</p>
          <p className="mt-1 text-[28px] font-bold">{contributors.length}</p>
          <p className="text-sm text-ink-muted">with verified impact</p>
        </div>
        <div className="rounded-[12px] border border-dashed border-amber-300 bg-warning-soft/50 p-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning"><Hourglass className="size-3.5" /> Self-reported</p>
          <p className="mt-1 text-[28px] font-bold">{formatNumber(toNumber(pending._sum.hours))}</p>
          <p className="text-sm text-ink-muted">hours awaiting verification — not counted</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progress towards targets</CardTitle>
            <CardDescription>Only verified contributions count towards targets.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {targets.length ? (
            <ul className="space-y-5">
              {targets.map((t) => {
                const done = totals.find((x) => x.key === t.metric.key)?.value ?? 0;
                return (
                  <li key={t.id}>
                    <div className="mb-1.5 flex justify-between gap-4 text-sm">
                      <span className="font-medium">{t.metric.name}</span>
                      <span className="text-ink-muted"><span className="font-semibold text-ink">{formatNumber(done, 0)}</span> / {formatNumber(t.targetValue, 0)} {t.metric.unit}</span>
                    </div>
                    <Progress value={(done / t.targetValue) * 100} label={t.metric.name} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">This project hasn&apos;t set measurable targets yet.</p>
          )}
          {totals.filter((t) => !targets.some((x) => x.metric.key === t.key)).length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {totals.filter((t) => !targets.some((x) => x.metric.key === t.key)).map((t) => (
                <div key={t.key} className="rounded-[10px] bg-canvas p-3">
                  <p className="text-lg font-bold">{formatNumber(t.value, 0)} <span className="text-sm font-normal text-ink-muted">{t.unit}</span></p>
                  <p className="text-xs text-ink-muted">{t.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Hours per month</CardTitle><CardDescription>Verified and self-reported hours, last 6 months</CardDescription></div></CardHeader>
        <CardContent><HoursBarChart data={monthly} /></CardContent>
      </Card>
    </div>
  );
}

async function UpdatesTab({ projectId, canManage, userId }: { projectId: string; canManage: boolean; userId?: string }) {
  const posts = await db.post.findMany({
    where: { projectId, type: { in: ["PROJECT_UPDATE", "EVENT"] }, isHidden: false },
    include: postInclude(userId),
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <div className="space-y-4">
      {canManage && (
        <Card>
          <CardHeader><CardTitle>Post a progress report</CardTitle></CardHeader>
          <CardContent><UpdateComposer projectId={projectId} /></CardContent>
        </Card>
      )}
      {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} currentUserId={userId} />) : (
        <EmptyState icon={<MessageSquare />} title="No updates yet" description="Progress reports from the project team will appear here." />
      )}
    </div>
  );
}

async function ManageTab({ project }: { project: NonNullable<Awaited<ReturnType<typeof load>>> }) {
  const now = new Date();
  const [pendingSubs, opps] = await Promise.all([
    db.impactSubmission.findMany({
      where: { projectId: project.id, status: "PENDING" },
      include: { user: { select: { name: true, image: true } }, values: { include: { metric: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.volunteerOpportunity.findMany({
      where: { projectId: project.id, OR: [{ startsAt: { gt: new Date(now.getTime() - 30 * 86400_000) } }, { status: "OPEN" }] },
      include: {
        applications: { where: { status: { not: "WITHDRAWN" } }, include: { user: { select: { name: true, image: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div><CardTitle>Project settings</CardTitle><CardDescription>Status controls whether volunteers can join.</CardDescription></div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <ProjectStatusSelect projectId={project.id} status={project.status} />
          <Button variant="secondary" asChild><Link href={`/projects/${project.slug}/edit`}><Pencil /> Edit details</Link></Button>
          <Button variant="secondary" asChild><Link href={`/volunteer/new?projectId=${project.id}`}><Plus /> New volunteer opportunity</Link></Button>
          <DeleteProjectButton projectId={project.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div><CardTitle>Contributions to verify ({pendingSubs.length})</CardTitle><CardDescription>Check evidence before verifying. Verified entries count towards impact, badges and leaderboards.</CardDescription></div>
        </CardHeader>
        <CardContent>
          {pendingSubs.length ? (
            <ul className="divide-y divide-border">
              {pendingSubs.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <Avatar name={s.user.name} src={s.user.image} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{s.user.name} · <span className="font-normal">{s.title}</span></p>
                    <p className="text-sm text-ink-muted">
                      {formatDate(s.date)} · {formatNumber(toNumber(s.hours))} h
                      {s.values.map((v) => ` · ${formatNumber(v.value)} ${v.metric.unit}`).join("")}
                    </p>
                    {s.description && <p className="mt-1 text-sm text-slate-700">{s.description}</p>}
                    {s.evidenceUrl ? (
                      <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold text-link hover:underline">View evidence</a>
                    ) : (
                      <p className="mt-1 text-xs text-warning">No evidence attached</p>
                    )}
                  </div>
                  <ReviewButtons submissionId={s.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">Nothing waiting for review. 🎉</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Volunteer sign-ups</CardTitle><CardDescription>Approve applicants before an activity; confirm attendance afterwards to verify their hours.</CardDescription></div></CardHeader>
        <CardContent className="space-y-6">
          {opps.length === 0 && <p className="text-sm text-ink-muted">No recent or upcoming opportunities.</p>}
          {opps.map((o) => {
            const past = o.startsAt < now;
            const hours = Math.round(((o.endsAt.getTime() - o.startsAt.getTime()) / 3600_000) * 2) / 2;
            return (
              <div key={o.id} className="rounded-[12px] border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/volunteer/${o.id}`} className="font-semibold hover:underline">{o.title}</Link>
                    <p className="text-sm text-ink-muted">{formatDate(o.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} · {o.applications.filter((a) => a.status === "APPROVED" || a.status === "COMPLETED").length}/{o.spots} confirmed · <Badge variant={o.status === "OPEN" ? "success" : "neutral"}>{o.status.toLowerCase()}</Badge></p>
                  </div>
                  {!past && <OpportunityStatusButtons id={o.id} status={o.status} />}
                </div>
                {o.applications.length > 0 && (
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {o.applications.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                        <Avatar name={a.user.name} src={a.user.image} size={28} />
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-medium">{a.user.name}</span>
                          {a.motivation && <span className="block truncate text-xs text-ink-muted">“{a.motivation}”</span>}
                        </span>
                        <Badge variant={a.status === "APPROVED" || a.status === "COMPLETED" ? "success" : a.status === "PENDING" ? "warning" : a.status === "REJECTED" ? "danger" : "info"}>{a.status.toLowerCase()}</Badge>
                        <ApplicationReview applicationId={a.id} status={a.status} past={past} defaultHours={hours} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Milestones</CardTitle><CardDescription>Progress ({project.progress}%) is calculated from completed milestones.</CardDescription></div></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {project.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                {m.completedAt ? <CircleCheck className="size-5 shrink-0 text-accent" /> : <CircleDashed className="size-5 shrink-0 text-ink-subtle" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.title}</span>
                  {m.dueDate && <span className="text-xs text-ink-muted">Due {formatDate(m.dueDate)}</span>}
                </span>
                <MilestoneToggle id={m.id} done={Boolean(m.completedAt)} title={m.title} />
              </li>
            ))}
          </ul>
          <AddMilestoneForm projectId={project.id} />
          <p className="mt-4 text-xs text-ink-subtle">Last updated {timeAgo(project.updatedAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
