import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck2, ChartColumn, Hourglass, ShieldCheck, Sparkles, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SDGS, sdgForeground } from "@/lib/sdg";
import { formatInt, formatNumber, toNumber } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { ProjectCard } from "@/components/projects/project-card";
import { projectCardInclude, toProjectCard } from "@/server/queries/projects";
import { peopleReached } from "@/server/queries/impact";

export const revalidate = 300;

export default async function LandingPage() {
  const user = await getCurrentUser();
  const [hours, people, volunteers, projectCount, orgs, featured] = await Promise.all([
    db.impactSubmission.aggregate({ where: { status: "VERIFIED" }, _sum: { hours: true } }),
    peopleReached({ status: "VERIFIED" }),
    db.impactSubmission.findMany({ where: { status: "VERIFIED" }, distinct: ["userId"], select: { userId: true } }),
    db.project.count({ where: { moderationStatus: "APPROVED" } }),
    db.organization.count({ where: { verificationStatus: "VERIFIED" } }),
    db.project.findMany({ where: { moderationStatus: "APPROVED", status: "RECRUITING" }, include: projectCardInclude(), orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const stats = [
    { v: formatNumber(toNumber(hours._sum.hours), 0), l: "verified volunteer hours" },
    { v: formatInt(people), l: "people reached" },
    { v: formatInt(volunteers.length), l: "volunteers with verified impact" },
    { v: formatInt(projectCount), l: "live projects" },
  ];
  const primaryCta = user ? { href: "/dashboard", label: "Go to your dashboard" } : { href: "/register", label: "Join for free" };

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/85 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex" aria-label="Main">
            <Link href="/sdgs" className="hover:text-ink">The 17 Goals</Link>
            <Link href="/projects" className="hover:text-ink">Projects</Link>
            <Link href="/volunteer" className="hover:text-ink">Volunteer</Link>
            <Link href="/organizations" className="hover:text-ink">Organizations</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!user && <Link href="/login" className="hidden h-9 items-center rounded-[10px] px-3 text-sm font-semibold hover:bg-slate-100 sm:inline-flex">Sign in</Link>}
            <Link href={primaryCta.href} className="inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">{user ? "Dashboard" : "Join free"}</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(5,150,105,0.12),transparent),radial-gradient(40%_40%_at_0%_100%,rgba(38,189,226,0.10),transparent)]" />
          <div className="container-page relative grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-mint px-3 py-1 text-xs font-semibold text-forest-900">
                <ShieldCheck className="size-3.5" /> Impact you can verify — not just claim
              </p>
              <h1 className="mt-6 font-display text-[52px] leading-[0.98] tracking-tight text-ink sm:text-[76px]">
                Turn care for the Global Goals into <em className="text-forest-800">local, measurable</em> action.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
                SDG Impact Hub connects volunteers, students, universities and NGOs around projects for the 17 UN Sustainable Development Goals — then measures what really changed.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={primaryCta.href} className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-primary px-6 text-[15px] font-semibold text-white shadow-raised hover:bg-primary-hover">
                  {primaryCta.label} <ArrowRight className="size-4" />
                </Link>
                <Link href="/projects" className="inline-flex h-12 items-center rounded-[12px] border border-border-strong bg-surface px-6 text-[15px] font-semibold hover:bg-canvas">Explore projects</Link>
              </div>
            </div>
            <div className="relative" aria-hidden>
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {SDGS.map((g, i) => (
                  <Link key={g.id} href={`/sdgs/${g.id}`} tabIndex={-1}
                    className={`flex aspect-square items-end rounded-[12px] p-2 text-lg font-extrabold shadow-card transition-transform hover:-translate-y-1 sm:text-2xl ${i === 0 ? "col-span-2 row-span-2 text-5xl sm:text-6xl" : ""}`}
                    style={{ background: g.color, color: sdgForeground(g.color) }}>
                    {g.id}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live stats */}
        <section className="border-y border-border bg-canvas" aria-label="Platform impact">
          <div className="container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l}>
                <p className="font-display text-5xl text-forest-900">{s.v}</p>
                <p className="mt-1 text-sm text-ink-muted">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="container-page pb-6 text-xs text-ink-subtle">Live figures. Only contributions verified by a project organizer or administrator are counted.</p>
        </section>

        {/* How it works */}
        <section className="container-page py-20">
          <h2 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">From “I want to help” to proof that it mattered.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, t: "Find your fit", d: "Follow the goals you care about. Our recommendations weigh your skills, interests and location — and explain why." },
              { icon: CalendarCheck2, t: "Show up", d: "Join a project or sign up for a session in two clicks. Add it to your calendar and get a reminder the day before." },
              { icon: ChartColumn, t: "Measure honestly", d: "Record hours and outcomes with evidence. Organizers verify them, so your impact report means something." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-[12px] bg-mint text-link"><Icon className="size-5" /></span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-subtle">Step {i + 1}</p>
                <h3 className="mt-1 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-ink-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Featured projects */}
        {featured.length > 0 && (
          <section className="bg-canvas py-20">
            <div className="container-page">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-4xl sm:text-5xl">Recruiting now</h2>
                  <p className="mt-2 text-ink-muted">Projects looking for people like you.</p>
                </div>
                <Link href="/projects" className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">All projects <ArrowRight className="size-4" /></Link>
              </div>
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => <ProjectCard key={p.id} p={toProjectCard(p, null)} />)}
              </div>
            </div>
          </section>
        )}

        {/* Trust */}
        <section className="container-page grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-4xl leading-tight sm:text-5xl">We never call an estimate a result.</h2>
            <p className="mt-4 text-lg text-ink-muted">Every contribution is labelled. Self-reported entries are visible to you, but only verified impact counts towards badges, leaderboards, project targets and the numbers on this page.</p>
          </div>
          <div className="space-y-3 rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-raised">
            {[
              { icon: BadgeCheck, c: "text-link bg-mint", t: "Verified", d: "Confirmed by the project organizer or an administrator — with attendance or evidence." },
              { icon: Hourglass, c: "text-warning bg-warning-soft", t: "Self-reported", d: "Your own record, awaiting review. Not included in totals." },
              { icon: Users, c: "text-info bg-info-soft", t: "Quality over quantity", d: "XP is capped per entry and per day, so the most reliable contributors rise — not the busiest loggers." },
            ].map(({ icon: Icon, c, t, d }) => (
              <div key={t} className="flex gap-4 rounded-[12px] p-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${c}`}><Icon className="size-5" /></span>
                <div><p className="font-semibold">{t}</p><p className="text-sm text-ink-muted">{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Organizations */}
        <section className="container-page pb-20">
          <div className="relative overflow-hidden rounded-[24px] bg-forest-900 px-6 py-14 text-white sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(5,150,105,0.5),transparent_60%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200"><Building2 className="size-4" /> For NGOs, universities and community groups</p>
                <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Recruit, coordinate and report — in one place.</h2>
                <p className="mt-4 max-w-xl text-emerald-50/90">Publish projects, manage sign-ups and waitlists, verify volunteer hours and export impact reports for funders. {orgs} verified organizations already do.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href={user ? "/organizations/new" : "/register"} className="inline-flex h-12 items-center rounded-[12px] bg-white px-6 font-semibold text-forest-900 hover:bg-emerald-50">Register your organization</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-canvas">
        <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-sm text-ink-muted">An independent community platform supporting the UN Sustainable Development Goals. Not affiliated with the United Nations.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted" aria-label="Footer">
            <Link href="/sdgs" className="hover:text-ink">The Goals</Link>
            <Link href="/projects" className="hover:text-ink">Projects</Link>
            <Link href="/volunteer" className="hover:text-ink">Volunteer</Link>
            <Link href="/help" className="hover:text-ink">Help Center</Link>
            <Link href="/help#privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
