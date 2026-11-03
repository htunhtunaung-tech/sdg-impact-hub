import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { ReportDecision } from "../admin-actions";

async function describe(type: string, id: string) {
  switch (type) {
    case "POST": { const p = await db.post.findUnique({ where: { id }, include: { author: { select: { name: true } } } }); return p ? { text: p.title ?? p.body, by: p.author.name, href: `/community/post/${p.id}`, hidden: p.isHidden } : null; }
    case "COMMENT": { const c = await db.comment.findUnique({ where: { id }, include: { author: { select: { name: true } } } }); return c ? { text: c.body, by: c.author.name, href: `/community/post/${c.postId}`, hidden: c.isHidden } : null; }
    case "PROJECT": { const p = await db.project.findUnique({ where: { id }, include: { organizer: { select: { name: true } } } }); return p ? { text: p.title, by: p.organizer.name, href: `/projects/${p.slug}`, hidden: p.moderationStatus === "REJECTED" } : null; }
    case "USER": { const u = await db.user.findUnique({ where: { id }, include: { profile: true } }); return u ? { text: `${u.name} (${u.email})`, by: u.name, href: u.profile ? `/u/${u.profile.username}` : null, hidden: u.status === "SUSPENDED" } : null; }
    case "ORGANIZATION": { const o = await db.organization.findUnique({ where: { id } }); return o ? { text: o.name, by: "", href: `/organizations/${o.slug}`, hidden: false } : null; }
    default: { const m = await db.message.findUnique({ where: { id }, include: { sender: { select: { name: true } } } }); return m ? { text: m.body, by: m.sender.name, href: null, hidden: false } : null; }
  }
}

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status === "closed" ? "closed" : "open";
  const reports = await db.report.findMany({
    where: status === "open" ? { status: "OPEN" } : { status: { not: "OPEN" } },
    include: { reporter: { select: { name: true } }, resolvedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const targets = await Promise.all(reports.map((r) => describe(r.targetType, r.targetId)));
  return (
    <div className="space-y-4">
      <LinkTabs active={status} tabs={[{ key: "open", label: "Open", href: "/admin/reports" }, { key: "closed", label: "Resolved", href: "/admin/reports?status=closed" }]} />
      {reports.length ? (
        <Card className="divide-y divide-border">
          {reports.map((r, i) => {
            const t = targets[i];
            return (
              <div key={r.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2"><Badge variant="danger">{r.reason}</Badge><Badge variant="outline">{r.targetType.toLowerCase()}</Badge><span className="text-xs text-ink-subtle">Reported by {r.reporter.name} · {formatDate(r.createdAt)}</span></p>
                  {t ? (
                    <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm text-slate-700">
                      <span className="line-clamp-3">{t.text}</span>
                      {t.by && <span className="block text-xs text-ink-muted">— {t.by}{t.hidden && " · currently hidden/suspended"}</span>}
                      {t.href && <Link href={t.href} className="text-xs font-semibold text-link hover:underline">Open</Link>}
                    </blockquote>
                  ) : <p className="mt-2 text-sm text-ink-muted">The reported content no longer exists.</p>}
                  {r.details && <p className="mt-2 text-sm text-ink-muted">“{r.details}”</p>}
                  {r.status !== "OPEN" && <p className="mt-2 text-xs text-ink-subtle">{r.status.toLowerCase()} by {r.resolvedBy?.name} · {r.resolution}</p>}
                </div>
                {r.status === "OPEN" && <ReportDecision reportId={r.id} canHide={["POST", "COMMENT", "PROJECT"].includes(r.targetType) && Boolean(t)} />}
              </div>
            );
          })}
        </Card>
      ) : <EmptyState title={status === "open" ? "No open reports" : "No resolved reports"} />}
    </div>
  );
}
