import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/ui/tabs";
import { ApplicationReview, OpportunityStatusButtons } from "../../projects/[slug]/project-widgets";

export const metadata: Metadata = { title: "Manage sign-ups" };

export default async function ManageSignupsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser("/volunteer/manage");
  const show = (await searchParams).show === "past" ? "past" : "upcoming";
  const now = new Date();
  const scope =
    user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { createdById: user.id },
            { project: { members: { some: { userId: user.id, role: { in: ["ORGANIZER" as const, "COORDINATOR" as const] } } } } },
            { organization: { members: { some: { userId: user.id, role: { in: ["OWNER" as const, "ADMIN" as const] } } } } },
          ],
        };
  const opps = await db.volunteerOpportunity.findMany({
    where: { AND: [scope, show === "upcoming" ? { startsAt: { gt: now } } : { startsAt: { lte: now } }] },
    include: {
      project: { select: { title: true, slug: true } },
      applications: { where: { status: { not: "WITHDRAWN" } }, include: { user: { select: { name: true, image: true, profile: { select: { username: true } } } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { startsAt: show === "upcoming" ? "asc" : "desc" },
    take: 50,
  });
  const pending = opps.reduce((n, o) => n + o.applications.filter((a) => a.status === "PENDING").length, 0);
  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader title="Manage sign-ups" description={show === "upcoming" ? `${pending} application${pending === 1 ? "" : "s"} waiting for your decision.` : "Confirm attendance to verify volunteers' hours."} actions={<Button asChild><Link href="/volunteer/new"><Plus /> New opportunity</Link></Button>} />
      <LinkTabs className="mb-6" active={show} tabs={[{ key: "upcoming", label: "Upcoming", href: "/volunteer/manage" }, { key: "past", label: "Past · confirm attendance", href: "/volunteer/manage?show=past" }]} />
      {opps.length === 0 && <EmptyState title="Nothing here" description="Opportunities you create or co-manage will appear here." />}
      <div className="space-y-4">
        {opps.map((o) => {
          const past = o.startsAt <= now;
          const hours = Math.round(((o.endsAt.getTime() - o.startsAt.getTime()) / 3600_000) * 2) / 2;
          const confirmed = o.applications.filter((a) => a.status === "APPROVED" || a.status === "COMPLETED").length;
          return (
            <section key={o.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/volunteer/${o.id}`} className="text-[17px] font-semibold hover:underline">{o.title}</Link>
                  <p className="text-sm text-ink-muted">
                    {formatDate(o.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                    {o.project && <> · <Link href={`/projects/${o.project.slug}`} className="hover:underline">{o.project.title}</Link></>} · {confirmed}/{o.spots} confirmed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === "OPEN" ? "success" : "neutral"}>{o.status.toLowerCase()}</Badge>
                  {!past && <OpportunityStatusButtons id={o.id} status={o.status} />}
                </div>
              </div>
              {o.applications.length ? (
                <ul className="mt-3 divide-y divide-border border-t border-border">
                  {o.applications.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                      <Avatar name={a.user.name} src={a.user.image} size={32} />
                      <div className="min-w-0 flex-1">
                        {a.user.profile ? <Link href={`/u/${a.user.profile.username}`} className="font-medium hover:underline">{a.user.name}</Link> : <span className="font-medium">{a.user.name}</span>}
                        {a.motivation && <p className="text-sm text-ink-muted">“{a.motivation}”</p>}
                        <p className="text-xs text-ink-subtle">Applied {formatDate(a.createdAt, { day: "numeric", month: "short" })}</p>
                      </div>
                      <Badge variant={a.status === "APPROVED" || a.status === "COMPLETED" ? "success" : a.status === "PENDING" ? "warning" : a.status === "REJECTED" ? "danger" : "info"}>{a.status.toLowerCase()}</Badge>
                      <ApplicationReview applicationId={a.id} status={a.status} past={past} defaultHours={hours} />
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-ink-muted">No sign-ups yet.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
