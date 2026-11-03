import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/misc";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { ProjectDecision } from "../admin-actions";

export default async function AdminProjects({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = (await searchParams).status;
  const status = s === "APPROVED" || s === "REJECTED" ? s : "PENDING_REVIEW";
  const projects = await db.project.findMany({
    where: { moderationStatus: status },
    include: { organizer: { select: { name: true, email: true } }, organization: { select: { name: true, verificationStatus: true } }, goals: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-4">
      <LinkTabs active={status} tabs={[{ key: "PENDING_REVIEW", label: "Awaiting review", href: "/admin/projects" }, { key: "APPROVED", label: "Published", href: "/admin/projects?status=APPROVED" }, { key: "REJECTED", label: "Rejected", href: "/admin/projects?status=REJECTED" }]} />
      {projects.length ? (
        <Card className="divide-y divide-border">
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold"><Link href={`/projects/${p.slug}`} className="hover:underline">{p.title}</Link> {p.goals.map((g) => <SdgNumber key={g.goalId} goal={g.goalId} size={20} />)}</p>
                <p className="mt-1 text-sm text-slate-700">{p.summary}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  By {p.organizer.name} ({p.organizer.email}){p.organization && <> · {p.organization.name} <Badge variant={p.organization.verificationStatus === "VERIFIED" ? "success" : "warning"}>{p.organization.verificationStatus.toLowerCase()}</Badge></>} · submitted {formatDate(p.createdAt)} · {p.isOnline ? "Online" : p.city}
                </p>
                {p.moderationNote && <p className="mt-1 text-xs text-danger">Note: {p.moderationNote}</p>}
              </div>
              <ProjectDecision projectId={p.id} status={p.moderationStatus} />
            </div>
          ))}
        </Card>
      ) : <EmptyState title="Nothing here" description="No projects in this state." />}
    </div>
  );
}
