import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Clock, FolderOpen, MapPin, Sparkles, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canManageOpportunity } from "@/lib/permissions";
import { sdg } from "@/lib/sdg";
import { formatDate, formatTimeRange } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SdgLabel } from "@/components/sdg/sdg-badge";
import { MapView } from "@/components/map/map-view";
import { StatusBadge } from "@/components/volunteer/opportunity-row";
import { CancelSpotButton, SignUpButton } from "@/components/volunteer/signup-button";
import { DateTile } from "@/components/volunteer/date-tile";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await db.volunteerOpportunity.findUnique({ where: { id: (await params).id }, select: { title: true } });
  return { title: o?.title ?? "Opportunity" };
}

export default async function OpportunityPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const o = await db.volunteerOpportunity.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true, slug: true, verificationStatus: true } },
      project: { select: { title: true, slug: true, moderationStatus: true } },
      _count: { select: { applications: { where: { status: { in: ["PENDING", "APPROVED"] } } } } },
    },
  });
  if (!o || (o.project && o.project.moderationStatus !== "APPROVED" && !(await canManageOpportunity(user, o.id)))) notFound();
  const mine = user ? await db.volunteerApplication.findUnique({ where: { opportunityId_userId: { opportunityId: o.id, userId: user.id } } }) : null;
  const canManage = await canManageOpportunity(user, o.id);
  const spotsLeft = Math.max(o.spots - o._count.applications, 0);
  const past = o.startsAt < new Date();
  const active = mine && mine.status !== "WITHDRAWN" ? mine : null;
  const when = `${formatDate(o.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${formatTimeRange(o.startsAt, o.endsAt)}`;
  const hours = Math.round(((o.endsAt.getTime() - o.startsAt.getTime()) / 3600_000) * 10) / 10;

  return (
    <div className="container-page max-w-5xl py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/volunteer" className="font-medium text-link hover:underline">Volunteer</Link>
        <ChevronRight className="size-4 text-ink-subtle" />
        <span className="truncate text-ink-muted">{o.title}</span>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="flex items-start gap-4">
            <DateTile date={o.startsAt} className="size-16" />
            <div>
              <SdgLabel goal={o.goalId} short={false} link />
              <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">{o.title}</h1>
              {o.organization && (
                <p className="mt-1 text-ink-muted">
                  <Link href={`/organizations/${o.organization.slug}`} className="font-medium hover:underline">{o.organization.name}</Link>
                  {o.organization.verificationStatus === "VERIFIED" && <Badge variant="success" className="ml-2">Verified</Badge>}
                </p>
              )}
            </div>
          </div>
          {o.status !== "OPEN" && <p className="mt-4 rounded-[14px] bg-slate-100 px-3 py-2 text-sm font-medium">This opportunity is {o.status === "CANCELLED" ? "cancelled" : "closed for sign-ups"}.</p>}
          <section className="mt-6">
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-slate-700">{o.description}</p>
          </section>
          {o.project && (
            <Link href={`/projects/${o.project.slug}`} className="mt-6 flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4 hover:bg-canvas">
              <FolderOpen className="size-5 text-link" />
              <span className="flex-1"><span className="block text-xs text-ink-muted">Part of the project</span><span className="font-semibold">{o.project.title}</span></span>
              <ChevronRight className="size-4 text-ink-subtle" />
            </Link>
          )}
          {!o.isOnline && o.latitude != null && o.longitude != null && (
            <Card className="mt-6 overflow-hidden">
              <MapView points={[{ lat: o.latitude, lng: o.longitude, label: o.locationName, color: sdg(o.goalId).color }]} className="h-64" zoom={13} />
            </Card>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="shadow-raised">
            <CardContent className="space-y-4 pt-6">
              <dl className="space-y-3 text-[15px]">
                <div className="flex gap-3"><CalendarDays className="size-5 text-link" /><div><dt className="text-xs text-ink-muted">Date</dt><dd className="font-medium">{formatDate(o.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</dd></div></div>
                <div className="flex gap-3"><Clock className="size-5 text-link" /><div><dt className="text-xs text-ink-muted">Time</dt><dd className="font-medium">{formatTimeRange(o.startsAt, o.endsAt)} ({hours} h)</dd></div></div>
                <div className="flex gap-3"><MapPin className="size-5 text-link" /><div><dt className="text-xs text-ink-muted">Location</dt><dd className="font-medium">{o.isOnline ? "Online" : o.locationName}</dd></div></div>
                <div className="flex gap-3"><Users className="size-5 text-link" /><div><dt className="text-xs text-ink-muted">Spots</dt><dd className="font-medium">{spotsLeft} of {o.spots} left{o.requiresApproval ? " · organizer approves" : " · instant sign-up"}</dd></div></div>
                <div className="flex gap-3"><Sparkles className="size-5 text-link" /><div><dt className="text-xs text-ink-muted">Skills</dt><dd className="font-medium">{o.skills.length ? o.skills.join(", ") : "None required"}</dd></div></div>
              </dl>
              {active && <div className="flex justify-center"><StatusBadge status={active.status} /></div>}
              {canManage ? (
                <Button className="w-full" size="lg" asChild><Link href="/volunteer/manage">Manage sign-ups</Link></Button>
              ) : past ? (
                active && (active.status === "APPROVED" || active.status === "COMPLETED") ? (
                  <Button className="w-full" size="lg" asChild><Link href={`/impact/new?opportunityId=${o.id}`}>Log your impact</Link></Button>
                ) : <p className="text-center text-sm text-ink-muted">This activity has taken place.</p>
              ) : active ? (
                ["APPROVED", "PENDING", "WAITLISTED"].includes(active.status) && (
                  <div className="flex flex-col items-center gap-2">
                    {active.status !== "WAITLISTED" && <Button variant="secondary" className="w-full" asChild><a href={`/api/calendar/${o.id}`}>Add to calendar</a></Button>}
                    <CancelSpotButton applicationId={active.id} label={active.status === "WAITLISTED" ? "Leave waitlist" : "Cancel my spot"} />
                  </div>
                )
              ) : o.status === "OPEN" ? (
                <SignUpButton size="lg" className="w-full" signedIn={Boolean(user)} opp={{ id: o.id, title: o.title, org: o.organization?.name ?? null, when, where: o.isOnline ? "Online" : o.locationName, requiresApproval: o.requiresApproval, full: spotsLeft === 0 }} />
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
