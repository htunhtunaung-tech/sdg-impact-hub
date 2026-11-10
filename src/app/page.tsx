import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck2, ChartColumn, Hourglass, ShieldCheck, Sparkles, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CountUp } from "@/components/motion/count-up";
import { TermHelp } from "@/components/ui/term-help";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { SDGS } from "@/lib/sdg";
import { DeviceMockup } from "@/components/brand/device-mockup";
import { CreatorCredit } from "@/components/layout/creator-credit";
import { toNumber } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ProjectCard } from "@/components/projects/project-card";
import { projectCardInclude, toProjectCard } from "@/server/queries/projects";
import { peopleReached } from "@/server/queries/impact";

export const revalidate = 300;

export default async function LandingPage() {
  const user = await getCurrentUser();
  // Light-data mode: browsers send "Save-Data: on" when the user turns on data saving
  const saveData = (await headers()).get("save-data")?.toLowerCase() === "on";
  const [hours, people, volunteers, projectCount, orgs, featured] = await Promise.all([
    db.impactSubmission.aggregate({ where: { status: "VERIFIED" }, _sum: { hours: true } }),
    peopleReached({ status: "VERIFIED" }),
    db.impactSubmission.findMany({ where: { status: "VERIFIED" }, distinct: ["userId"], select: { userId: true } }),
    db.project.count({ where: { moderationStatus: "APPROVED" } }),
    db.organization.count({ where: { verificationStatus: "VERIFIED" } }),
    db.project.findMany({ where: { moderationStatus: "APPROVED", status: "RECRUITING" }, include: projectCardInclude(), orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const stats = [
    { v: Math.round(toNumber(hours._sum.hours)), l: "verified volunteer hours", s: "verified hours" },
    { v: people, l: "people reached", s: "people reached", help: true },
    { v: volunteers.length, l: "volunteers with verified impact", s: "volunteers" },
    { v: projectCount, l: "live projects", s: "live projects" },
  ];
  const primaryCta = user ? { href: "/dashboard", label: "Go to your dashboard" } : { href: "/register", label: "Join for free" };

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 text-sm font-medium text-ink-muted md:flex" aria-label="Main">
            <Link href="/sdgs" className="inline-flex h-10 items-center rounded-full px-3 hover:bg-track hover:text-ink">The 17 Goals</Link>
            <Link href="/projects" className="inline-flex h-10 items-center rounded-full px-3 hover:bg-track hover:text-ink">Projects</Link>
            <Link href="/volunteer" className="inline-flex h-10 items-center rounded-full px-3 hover:bg-track hover:text-ink">Volunteer</Link>
            <Link href="/organizations" className="inline-flex h-10 items-center rounded-full px-3 hover:bg-track hover:text-ink">Organizations</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {!user && <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold hover:bg-track sm:inline-flex">Sign in</Link>}
            <Link href={primaryCta.href} className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-brand hover:bg-primary-hover">{user ? "Dashboard" : "Join free"}</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[image:var(--gradient-eco)]">
          {/* Soft SDG-coloured light drifting behind the hero (larger screens only, decorative) */}
          <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
            <span className="blob absolute -left-24 top-10 size-72 rounded-full bg-[#4C9F38]/15 blur-3xl" />
            <span className="blob absolute right-[8%] top-0 size-80 rounded-full bg-[#26BDE2]/15 blur-3xl [animation-delay:-6s]" />
            <span className="blob absolute bottom-0 left-[40%] size-64 rounded-full bg-[#FCC30B]/15 blur-3xl [animation-delay:-12s]" />
          </div>
          <div className="container-page relative grid gap-8 pb-6 pt-6 sm:gap-16 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-28">
            <div className="min-w-0">
              <p className="hero-in inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-forest-900 shadow-card">
                <ShieldCheck className="size-3.5" /> Impact you can verify — not just claim
              </p>
              <h1 style={{ "--d": "80ms" } as React.CSSProperties} className="hero-in mt-4 text-[32px] font-bold leading-[1.1] tracking-[-0.03em] text-ink sm:mt-6 sm:text-[64px] sm:leading-[1.04]">
                {/* Phones get a shorter headline so the stats fit on the first screen */}
                <span className="sm:hidden">Local action for the Global Goals, <span className="text-shimmer">measured.</span></span>
                <span className="hidden sm:inline">Turn care for the Global Goals into <span className="text-shimmer">local, measurable</span> action.</span>
              </h1>
              <p style={{ "--d": "160ms" } as React.CSSProperties} className="hero-in mt-3 max-w-xl text-base leading-relaxed text-ink-muted sm:hidden">
                Find projects near you or online. Get your hours verified and earn a certificate.
              </p>
              <p style={{ "--d": "160ms" } as React.CSSProperties} className="hero-in mt-6 hidden max-w-xl text-lg leading-relaxed text-ink-muted sm:block">
                SDG Impact Hub connects volunteers, students, universities and NGOs around projects for the 17 UN Sustainable Development Goals — then measures what really changed.
              </p>
              <div style={{ "--d": "240ms" } as React.CSSProperties} className="hero-in mt-5 flex flex-col gap-1 sm:mt-8 sm:flex-row sm:gap-3">
                <Link href={primaryCta.href} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-[15px] font-semibold text-white shadow-brand transition-[background-color,transform,box-shadow] duration-150 hover:bg-primary-hover hover:shadow-raised active:scale-[0.97]">
                  {primaryCta.label} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
                <Link href={user ? "/projects" : "/login"} className="inline-flex h-11 items-center justify-center rounded-full px-7 text-[15px] font-semibold text-link underline-offset-4 hover:underline sm:h-12 sm:bg-white sm:text-ink sm:no-underline sm:shadow-card sm:hover:bg-mint sm:hover:no-underline transition-[background-color,transform] duration-150 active:scale-[0.97]">
                  {user ? "Explore projects" : "I already have an account"}
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-between sm:hidden">
                <p className="text-sm font-semibold text-ink">The 17 goals</p>
                <Link href="/sdgs" className="inline-flex min-h-11 items-center text-sm font-semibold text-link">See all 17</Link>
              </div>
              {/* Phones: one swipeable row of 44 px tiles. Larger screens: a grid. */}
              <ul className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-10 sm:grid sm:max-w-[540px] sm:grid-cols-9 sm:overflow-visible sm:px-0 sm:pb-0" aria-label="The 17 goals">
                {SDGS.map((g, i) => (
                  <li key={g.id} style={{ "--i": i } as React.CSSProperties} className="tile-pop w-11 shrink-0 snap-start sm:w-auto">
                    <Link href={`/sdgs/${g.id}`} className="group block rounded-[12px] shadow-card transition-transform duration-200 hover:-translate-y-1 active:scale-95" aria-label={`Goal ${g.id}: ${g.title}`} title={g.title}>
                      <SdgTile goal={g.id} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Not rendered on phones: saves space and data */}
            <div style={{ "--d": "300ms" } as React.CSSProperties} className="hero-in hidden sm:block"><DeviceMockup /></div>
          </div>
        </section>

        {/* Live stats */}
        <section className="container-page relative z-10 sm:-mt-10" aria-label="Platform impact">
          <div style={{ "--d": "380ms" } as React.CSSProperties} className="hero-in grid grid-cols-2 gap-2 rounded-[var(--radius-2xl)] border border-border/80 bg-surface p-2 shadow-raised sm:gap-4 sm:p-4 lg:grid-cols-4">
            {stats.map((st, i) => (
              <div key={st.l} className={`min-w-0 rounded-[16px] p-3 sm:rounded-[20px] sm:p-5 ${["bg-tone-mint", "bg-tone-sky", "bg-tone-sun", "bg-tone-lilac"][i]}`}>
                <p className="truncate text-[28px] font-bold leading-none tracking-tight text-ink sm:text-[40px]"><CountUp value={st.v} animate={!saveData} /></p>
                <p className="mt-1.5 flex items-center gap-1 text-[13px] text-ink-muted sm:mt-2 sm:text-sm">
                  <span className="sm:hidden">{st.s}</span><span className="hidden sm:inline">{st.l}</span>
                  {st.help && <TermHelp term="peopleReached" />}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 hidden text-center text-xs text-ink-subtle sm:block">Live figures. Only contributions verified by a project organizer or administrator are counted.</p>
        </section>

        {/* How it works */}
        <section className="container-page py-20">
          <h2 className="reveal max-w-2xl text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">From “I want to help” to proof that it mattered.</h2>
          <ol className="reveal-group mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, t: "Find your fit", d: "Follow the goals you care about. Our recommendations weigh your skills, interests and location — and explain why." },
              { icon: CalendarCheck2, t: "Show up", d: "Join a project or sign up for a session in two clicks. Add it to your calendar and get a reminder the day before." },
              { icon: ChartColumn, t: "Measure honestly", d: "Record hours and outcomes with evidence. Organizers verify them, so your impact report means something." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className={`rounded-[var(--radius-xl)] p-6 transition-transform duration-300 hover:-translate-y-1 ${["bg-tone-mint", "bg-tone-sky", "bg-tone-sun"][i]}`}>
                <span className="flex size-12 items-center justify-center rounded-full bg-white text-forest-900 shadow-card"><Icon className="size-5" /></span>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-muted">Step {i + 1}</p>
                <h3 className="mt-1 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-ink-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Featured projects */}
        {featured.length > 0 && (
          <section className="py-20 sm:py-24">
            <div className="container-page">
              <div className="reveal flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[34px] font-bold tracking-tight sm:text-[44px]">Recruiting now</h2>
                  <p className="mt-2 text-ink-muted">Projects looking for people like you.</p>
                </div>
                <Link href="/projects" className="inline-flex items-center gap-1.5 font-semibold text-link hover:underline">All projects <ArrowRight className="size-4" /></Link>
              </div>
              <div className="reveal-group mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => <div key={p.id} className="min-w-0"><ProjectCard p={toProjectCard(p, null)} /></div>)}
              </div>
            </div>
          </section>
        )}

        {/* Trust */}
        <section className="container-page grid gap-10 py-20 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <h2 className="text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">We never call an estimate a result.</h2>
            <p className="mt-4 text-lg text-ink-muted">Every contribution is labelled. Self-reported entries are visible to you, but only verified impact counts towards badges, leaderboards, project targets and the numbers on this page.</p>
          </div>
          <div className="reveal space-y-3 rounded-[var(--radius-2xl)] border border-border/80 bg-surface p-6 shadow-raised">
            {[
              { icon: BadgeCheck, c: "text-link bg-mint", t: "Verified", d: "Confirmed by the project organizer or an administrator — with attendance or evidence." },
              { icon: Hourglass, c: "text-warning bg-warning-soft", t: "Self-reported", d: "Your own record, awaiting review. Not included in totals." },
              { icon: Users, c: "text-info bg-info-soft", t: "Quality over quantity", d: "XP is capped per entry and per day, so the most reliable contributors rise — not the busiest loggers." },
            ].map(({ icon: Icon, c, t, d }) => (
              <div key={t} className="flex gap-4 rounded-[16px] p-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${c}`}><Icon className="size-5" /></span>
                <div><p className="font-semibold">{t}</p><p className="text-sm text-ink-muted">{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Organizations */}
        <section className="container-page pb-20">
          <div className="reveal relative overflow-hidden rounded-[var(--radius-2xl)] bg-[image:var(--gradient-brand)] px-6 py-14 text-white sm:px-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(5,150,105,0.5),transparent_60%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-200"><Building2 className="size-4" /> For NGOs, universities and community groups</p>
                <h2 className="mt-3 text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">Recruit, coordinate and report — in one place.</h2>
                <p className="mt-4 max-w-xl text-emerald-50/90">Publish projects, manage sign-ups and waitlists, verify volunteer hours and export impact reports for funders. {orgs} verified organizations already do.</p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Link href={user ? "/organizations/new" : "/register"} className="inline-flex h-12 items-center rounded-full bg-white px-7 font-semibold text-forest-900 hover:bg-emerald-50">Register your organization</Link>
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
          <nav className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-muted [&_a]:inline-flex [&_a]:h-10 [&_a]:items-center [&_a]:px-2" aria-label="Footer">
            <Link href="/sdgs" className="hover:text-ink">The Goals</Link>
            <Link href="/projects" className="hover:text-ink">Projects</Link>
            <Link href="/volunteer" className="hover:text-ink">Volunteer</Link>
            <Link href="/help" className="hover:text-ink">Help Center</Link>
            <Link href="/help#privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
        <div className="container-page border-t border-border py-5">
          <CreatorCredit />
        </div>
      </footer>
    </div>
  );
}
