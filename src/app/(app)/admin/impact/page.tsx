import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { ReviewButtons } from "../../projects/[slug]/project-widgets";

export default async function AdminImpactReview() {
  const subs = await db.impactSubmission.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { name: true, image: true, profile: { select: { username: true } } } }, project: { select: { title: true, slug: true } }, values: { include: { metric: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  if (!subs.length) return <EmptyState title="All caught up" description="No self-reported contributions are waiting for verification." />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Project organizers usually verify contributions to their projects. Entries without a project (e.g. evidence challenges) can only be verified here.</p>
      <Card className="divide-y divide-border">
        {subs.map((s) => (
          <div key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <Avatar name={s.user.name} src={s.user.image} size={36} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.user.profile ? <Link href={`/u/${s.user.profile.username}`} className="hover:underline">{s.user.name}</Link> : s.user.name} · <span className="font-normal">{s.title}</span></p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <SdgNumber goal={s.goalId} size={18} /> {formatDate(s.date)} · {formatNumber(toNumber(s.hours))} h
                {s.values.map((v) => ` · ${formatNumber(v.value)} ${v.metric.unit}`).join("")}
                {s.project && <> · <Link href={`/projects/${s.project.slug}`} className="hover:underline">{s.project.title}</Link></>}
              </p>
              {s.description && <p className="mt-1 text-sm text-slate-700">{s.description}</p>}
              {s.evidenceUrl ? <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-link hover:underline">View evidence</a> : <p className="text-xs text-warning">No evidence attached</p>}
            </div>
            <ReviewButtons submissionId={s.id} />
          </div>
        ))}
      </Card>
    </div>
  );
}
