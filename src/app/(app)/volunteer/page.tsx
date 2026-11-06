import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarDays, Download, Heart, Plus, Settings2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { haversineKm, formatDate, formatTimeRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { OpportunityRow, StatusBadge } from "@/components/volunteer/opportunity-row";
import { DateTile } from "@/components/volunteer/date-tile";
import { CancelSpotButton } from "@/components/volunteer/signup-button";
import { MapView } from "@/components/map/map-view";
import { sdg } from "@/lib/sdg";
import { oppInclude, toRow } from "@/server/queries/opportunities";
import { VolunteerFilters } from "./volunteer-filters";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Volunteer" };

type SP = { tab?: string; when?: string; where?: string | string[]; skill?: string | string[]; time?: string | string[]; goal?: string; sort?: string; q?: string; view?: string };
const arr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);

export default async function VolunteerPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const tab = user && (sp.tab === "signups" || sp.tab === "schedule") ? sp.tab : "opportunities";
  const now = new Date();

  const [openCount, mySignupCount, managesAny] = await Promise.all([
    db.volunteerOpportunity.count({ where: { status: "OPEN", startsAt: { gt: now } } }),
    user ? db.volunteerApplication.count({ where: { userId: user.id, status: { in: ["APPROVED", "PENDING", "WAITLISTED"] }, opportunity: { startsAt: { gt: now } } } }) : 0,
    user ? db.volunteerOpportunity.count({ where: { OR: [{ createdById: user.id }, { project: { members: { some: { userId: user.id, role: { in: ["ORGANIZER", "COORDINATOR"] } } } } }] } }) : 0,
  ]);

  const tabs = [
    { key: "opportunities", label: `Opportunities (${openCount})`, href: "/volunteer" },
    ...(user
      ? [
          { key: "signups", label: `My sign-ups (${mySignupCount})`, href: "/volunteer?tab=signups" },
          { key: "schedule", label: "My schedule", href: "/volunteer?tab=schedule" },
        ]
      : []),
  ];

  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader
        title="Volunteer"
        description="Give your time where it counts. Sign up in two clicks."
        actions={
          user && managesAny > 0 ? (
            <>
              <Button variant="secondary" asChild><Link href="/volunteer/manage"><Settings2 /> Manage sign-ups</Link></Button>
              <Button asChild><Link href="/volunteer/new"><Plus /> New opportunity</Link></Button>
            </>
          ) : null
        }
      />
      <LinkTabs tabs={tabs} active={tab} className="mb-6" />
      {tab === "opportunities" && <Opportunities sp={sp} user={user} />}
      {tab === "signups" && user && <SignUps userId={user.id} />}
      {tab === "schedule" && user && <Schedule userId={user.id} />}
    </div>
  );
}

async function Opportunities({ sp, user }: { sp: SP; user: Awaited<ReturnType<typeof getCurrentUser>> }) {
  const now = new Date();
  const when = sp.when ?? "any";
  const where = arr(sp.where);
  const skills = arr(sp.skill);
  const times = arr(sp.time);
  const goal = Number(sp.goal) || null;
  const sort = sp.sort === "spots" ? "spots" : sp.sort === "nearest" ? "nearest" : "soonest";
  const q = sp.q?.trim().slice(0, 80);

  let end: Date | undefined;
  if (when === "week") end = new Date(now.getTime() + 7 * 86400_000);
  if (when === "30") end = new Date(now.getTime() + 30 * 86400_000);
  const filters: Prisma.VolunteerOpportunityWhereInput[] = [{ status: "OPEN" }, { startsAt: { gt: now, ...(end ? { lte: end } : {}) } }];
  if (goal) filters.push({ goalId: goal });
  if (skills.length) filters.push({ skills: { hasSome: skills } });
  if (q) filters.push({ OR: [{ title: { contains: q, mode: "insensitive" } }, { locationName: { contains: q, mode: "insensitive" } }, { organization: { name: { contains: q, mode: "insensitive" } } }] });
  const onlineOnly = where.includes("online") && !where.includes("near") && !where.includes("anywhere");
  if (onlineOnly) filters.push({ isOnline: true });

  let rows = await db.volunteerOpportunity.findMany({ where: { AND: filters }, include: oppInclude(user?.id), orderBy: { startsAt: "asc" }, take: 200 });

  const me = user?.profile?.latitude != null && user.profile.longitude != null ? { lat: user.profile.latitude, lng: user.profile.longitude } : null;
  const dist = (o: (typeof rows)[number]) => (me && o.latitude != null && o.longitude != null ? Math.round(haversineKm(me, { lat: o.latitude, lng: o.longitude })) : null);

  if (when === "weekend") rows = rows.filter((o) => [0, 6].includes(new Date(o.startsAt.getTime() + 7 * 3600_000).getUTCDay()) && o.startsAt.getTime() - now.getTime() < 8 * 86400_000);
  if (where.includes("near") && !where.includes("anywhere")) {
    rows = rows.filter((o) => (o.isOnline && where.includes("online")) || (me ? (dist(o) ?? 1e9) <= 25 : false));
  }
  if (times.length) {
    rows = rows.filter((o) => {
      const h = (o.endsAt.getTime() - o.startsAt.getTime()) / 3600_000;
      return (times.includes("short") && h < 2) || (times.includes("mid") && h >= 2 && h <= 4) || (times.includes("long") && h > 4);
    });
  }
  if (sort === "spots") rows.sort((a, b) => b.spots - b._count.applications - (a.spots - a._count.applications));
  if (sort === "nearest" && me) rows.sort((a, b) => (dist(a) ?? (a.isOnline ? 0 : 1e9)) - (dist(b) ?? (b.isOnline ? 0 : 1e9)));

  const allSkills = await db.volunteerOpportunity.findMany({ where: { status: "OPEN", startsAt: { gt: now } }, select: { skills: true } });
  const skillOptions = [...new Set(allSkills.flatMap((s) => s.skills))].sort();
  const mapPoints = rows.filter((o) => !o.isOnline && o.latitude != null && o.longitude != null).map((o) => ({ lat: o.latitude!, lng: o.longitude!, label: o.title, href: `/volunteer/${o.id}`, color: sdg(o.goalId).color }));

  return (
    <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
      <VolunteerFilters skills={skillOptions} hasLocation={Boolean(me)} signedIn={Boolean(user)} />
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">{rows.length} {rows.length === 1 ? "opportunity" : "opportunities"}</p>
        </div>
        {sp.view === "map" && (
          <Card className="mb-4 overflow-hidden">
            <MapView points={mapPoints} className="h-80" zoom={8} />
          </Card>
        )}
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((o) => <OpportunityRow key={o.id} o={toRow(o, dist(o))} signedIn={Boolean(user)} />)}
          </div>
        ) : (
          <EmptyState icon={<Heart />} title="No opportunities match" description={where.includes("near") && !me ? "Add your location in Settings to use “Near me”." : "Try widening the dates or removing a filter."} action={<Button variant="secondary" asChild><Link href="/volunteer">Reset filters</Link></Button>} />
        )}
      </div>
    </div>
  );
}

async function SignUps({ userId }: { userId: string }) {
  const apps = await db.volunteerApplication.findMany({
    where: { userId, status: { not: "WITHDRAWN" } },
    include: { opportunity: { include: { organization: { select: { name: true } } } } },
    orderBy: { opportunity: { startsAt: "desc" } },
  });
  const now = new Date();
  const upcoming = apps.filter((a) => a.opportunity.startsAt > now);
  const past = apps.filter((a) => a.opportunity.startsAt <= now);
  if (!apps.length) return <EmptyState icon={<Heart />} title="No sign-ups yet" description="Find something that fits your week." action={<Button asChild><Link href="/volunteer">Browse opportunities</Link></Button>} />;
  const Item = ({ a }: { a: (typeof apps)[number] }) => (
    <li className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center">
      <DateTile date={a.opportunity.startsAt} />
      <div className="min-w-0 flex-1">
        <Link href={`/volunteer/${a.opportunity.id}`} className="font-semibold hover:underline">{a.opportunity.title}</Link>
        <p className="text-sm text-ink-muted">{a.opportunity.organization?.name ?? "Community"} · {formatTimeRange(a.opportunity.startsAt, a.opportunity.endsAt)} · {a.opportunity.isOnline ? "Online" : a.opportunity.locationName}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={a.status} />
        {a.opportunity.startsAt > now && ["APPROVED", "PENDING", "WAITLISTED"].includes(a.status) && (
          <>
            {a.status !== "WAITLISTED" && <a href={`/api/calendar/${a.opportunity.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"><Download className="size-4" /> .ics</a>}
            <CancelSpotButton applicationId={a.id} label={a.status === "WAITLISTED" ? "Leave waitlist" : "Cancel"} />
          </>
        )}
        {a.opportunity.startsAt <= now && (a.status === "APPROVED" || a.status === "COMPLETED") && (
          <Link href={`/impact/new?opportunityId=${a.opportunity.id}`} className="text-sm font-semibold text-link hover:underline">Log impact</Link>
        )}
      </div>
    </li>
  );
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
        {upcoming.length ? <ul className="space-y-3">{upcoming.map((a) => <Item key={a.id} a={a} />)}</ul> : <p className="text-sm text-ink-muted">Nothing upcoming.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Past</h2>
          <ul className="space-y-3">{past.map((a) => <Item key={a.id} a={a} />)}</ul>
        </section>
      )}
    </div>
  );
}

async function Schedule({ userId }: { userId: string }) {
  const apps = await db.volunteerApplication.findMany({
    where: { userId, status: { in: ["APPROVED", "PENDING"] }, opportunity: { startsAt: { gt: new Date() } } },
    include: { opportunity: true },
    orderBy: { opportunity: { startsAt: "asc" } },
  });
  if (!apps.length) return <EmptyState icon={<CalendarDays />} title="Your schedule is clear" description="Confirmed and pending sign-ups appear here, grouped by month." />;
  const byMonth = new Map<string, typeof apps>();
  for (const a of apps) {
    const k = formatDate(a.opportunity.startsAt, { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), a]);
  }
  return (
    <div className="space-y-8">
      {[...byMonth.entries()].map(([month, items]) => (
        <section key={month}>
          <h2 className="mb-3 text-lg font-semibold">{month}</h2>
          <ol className="relative space-y-3 border-l-2 border-mint-strong pl-6">
            {items.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[31px] top-4 size-3 rounded-full border-2 border-surface bg-accent" aria-hidden />
                <Link href={`/volunteer/${a.opportunity.id}`} className="block rounded-[16px] border border-border bg-surface p-4 shadow-card hover:shadow-raised">
                  <p className="text-sm font-semibold text-link">{formatDate(a.opportunity.startsAt, { weekday: "long", day: "numeric", month: "long" })} · {formatTimeRange(a.opportunity.startsAt, a.opportunity.endsAt)}</p>
                  <p className="mt-0.5 font-semibold">{a.opportunity.title}</p>
                  <p className="text-sm text-ink-muted">{a.opportunity.isOnline ? "Online" : a.opportunity.locationName}</p>
                  <div className="mt-2"><StatusBadge status={a.status} /></div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
