import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, GraduationCap, MessageSquare, Target, TriangleAlert, Video, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sdg, sdgForeground } from "@/lib/sdg";
import { formatInt, formatNumber, timeAgo, toNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { SdgIcon } from "@/components/sdg/sdg-icon";
import { ProjectCard } from "@/components/projects/project-card";
import { OpportunityRow } from "@/components/volunteer/opportunity-row";
import { FollowGoalButton } from "./follow-button";
import { upcomingOpportunityRows } from "@/server/queries/opportunities";
import { toProjectCard, projectCardInclude } from "@/server/queries/projects";
import { peopleReached } from "@/server/queries/impact";

type Props = { params: Promise<{ id: string }> };

async function loadGoal(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1 || id > 17) return null;
  return db.sDGGoal.findUnique({
    where: { id },
    include: { targets: { orderBy: { code: "asc" } }, resources: true, _count: { select: { followers: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const goal = await loadGoal((await params).id);
  return { title: goal ? `Goal ${goal.id}: ${goal.title}` : "Goal not found", description: goal?.tagline };
}

const RES_ICON = { ARTICLE: FileText, REPORT: BookOpen, VIDEO: Video, COURSE: GraduationCap, TOOLKIT: Wrench } as const;

export default async function GoalPage({ params }: Props) {
  const goal = await loadGoal((await params).id);
  if (!goal || !goal.isActive) notFound();
  const user = await getCurrentUser();
  const fg = sdgForeground(goal.color);

  const [projects, opps, posts, hours, people, following, contributors] = await Promise.all([
    db.project.findMany({
      where: { moderationStatus: "APPROVED", goals: { some: { goalId: goal.id } } },
      include: projectCardInclude(user?.id),
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
    upcomingOpportunityRows({ goalId: goal.id }, user?.id, 4),
    db.post.findMany({
      where: { goalId: goal.id, isHidden: false },
      include: { author: { select: { name: true, image: true } }, _count: { select: { comments: true, reactions: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.impactSubmission.aggregate({ where: { goalId: goal.id, status: "VERIFIED" }, _sum: { hours: true } }),
    peopleReached({ goalId: goal.id, status: "VERIFIED" }),
    user ? db.userSdgInterest.findUnique({ where: { userId_goalId: { userId: user.id, goalId: goal.id } } }) : null,
    db.impactSubmission.findMany({ where: { goalId: goal.id, status: "VERIFIED" }, distinct: ["userId"], select: { userId: true } }),
  ]);

  const prev = goal.id > 1 ? sdg(goal.id - 1) : null;
  const next = goal.id < 17 ? sdg(goal.id + 1) : null;

  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: goal.color, color: fg }}>
        <SdgIcon goal={goal.id} className="pointer-events-none absolute -right-10 -top-10 size-72 opacity-15" strokeWidth={1.25} />
        <div className="container-page relative py-8 sm:py-12">
          <Link href="/sdgs" className="inline-flex items-center gap-1.5 text-sm font-semibold opacity-90 hover:opacity-100">
            <ArrowLeft className="size-4" /> All goals
          </Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.1em] opacity-90">Goal {goal.id}</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl">{goal.title}</h1>
              <p className="mt-3 text-[17px] leading-relaxed opacity-95">{goal.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <FollowGoalButton goalId={goal.id} following={Boolean(following)} signedIn={Boolean(user)} onColor={fg} />
              <Link href={`/projects?goal=${goal.id}`} className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-4 text-sm font-semibold text-ink hover:bg-slate-50">
                Projects for this goal <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-4 border-t pt-5" style={{ borderColor: fg === "#FFFFFF" ? "rgba(255,255,255,.3)" : "rgba(15,23,42,.2)" }}>
            <div><dt className="text-xs font-semibold uppercase tracking-wide opacity-85">Verified hours</dt><dd className="text-2xl font-bold">{formatNumber(toNumber(hours._sum.hours))}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide opacity-85">People reached</dt><dd className="text-2xl font-bold">{formatInt(people)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide opacity-85">Contributors</dt><dd className="text-2xl font-bold">{contributors.length}</dd></div>
          </dl>
        </div>
      </section>

      <div className="container-page grid gap-6 py-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>About this goal</CardTitle></CardHeader>
            <CardContent><p className="text-[15px] leading-relaxed text-slate-700">{goal.description}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="size-5 text-link" /> Key targets</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {goal.targets.map((t) => (
                  <li key={t.id} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-6 min-w-11 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold tabular-nums" style={{ background: goal.color, color: fg }}>
                      {t.code}
                    </span>
                    <span className="text-[15px] leading-relaxed text-slate-700">{t.description}</span>
                  </li>
                ))}
              </ul>
              <a href={`https://sdgs.un.org/goals/goal${goal.id}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
                All targets and indicators on sdgs.un.org <ExternalLink className="size-3.5" />
              </a>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TriangleAlert className="size-5 text-warning" /> Global challenges</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700 marker:text-ink-subtle">
                  {goal.challenges.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-mint/60">
              <CardHeader><CardTitle className="text-forest-900">How you can contribute</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2.5 text-[15px] leading-relaxed text-slate-700">
                  {goal.waysToContribute.map((w) => (
                    <li key={w} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Related projects</h2>
              <Link href={`/projects?goal=${goal.id}`} className="text-sm font-semibold text-link hover:underline">View all</Link>
            </div>
            {projects.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((p) => <ProjectCard key={p.id} p={toProjectCard(p, user)} />)}
              </div>
            ) : (
              <EmptyState title="No projects yet" description={`Be the first to start a project for Goal ${goal.id}.`} action={<Button asChild><Link href="/projects/new">Start a project</Link></Button>} />
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Volunteer opportunities</h2>
              <Link href={`/volunteer?goal=${goal.id}`} className="text-sm font-semibold text-link hover:underline">View all</Link>
            </div>
            {opps.length ? (
              <div className="space-y-3">{opps.map((o) => <OpportunityRow key={o.id} o={o} signedIn={Boolean(user)} />)}</div>
            ) : (
              <EmptyState title="No upcoming opportunities" description="Follow this goal and we'll recommend new ones as they're posted." />
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Learn more</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {goal.resources.map((r) => {
                  const Icon = RES_ICON[r.type];
                  return (
                    <li key={r.id}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-[10px] p-2 hover:bg-canvas">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-mint text-link"><Icon className="size-4" /></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold leading-snug">{r.title}</span>
                          <span className="text-xs text-ink-muted">{r.source}</span>
                        </span>
                        <ExternalLink className="ml-auto mt-1 size-3.5 shrink-0 text-ink-subtle" aria-label="opens in new tab" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="size-5 text-link" /> Community discussions</CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length ? (
                <ul className="space-y-4">
                  {posts.map((p) => (
                    <li key={p.id} className="flex gap-3">
                      <Avatar name={p.author.name} src={p.author.image} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm"><span className="font-semibold">{p.author.name}</span> <span className="text-ink-subtle">· {timeAgo(p.createdAt)}</span></p>
                        <Link href={`/community/post/${p.id}`} className="mt-0.5 line-clamp-3 text-sm text-slate-700 hover:underline">{p.title ?? p.body}</Link>
                        <p className="mt-1 text-xs text-ink-subtle">{p._count.comments} comments · {p._count.reactions} reactions</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">No discussions yet.</p>
              )}
              <Button variant="secondary" className="mt-5 w-full" asChild>
                <Link href={user ? `/community?goal=${goal.id}` : "/login?callbackUrl=/community"}>Join the conversation</Link>
              </Button>
            </CardContent>
          </Card>

          <nav className="grid grid-cols-2 gap-3" aria-label="Other goals">
            {prev ? (
              <Link href={`/sdgs/${prev.id}`} className="rounded-[12px] border border-border bg-surface p-3 text-sm hover:bg-canvas">
                <span className="text-xs text-ink-subtle">← Goal {prev.id}</span>
                <span className="block truncate font-semibold">{prev.shortTitle}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/sdgs/${next.id}`} className="rounded-[12px] border border-border bg-surface p-3 text-right text-sm hover:bg-canvas">
                <span className="text-xs text-ink-subtle">Goal {next.id} →</span>
                <span className="block truncate font-semibold">{next.shortTitle}</span>
              </Link>
            )}
          </nav>
        </aside>
      </div>
    </div>
  );
}
