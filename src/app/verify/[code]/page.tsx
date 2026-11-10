import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, FolderOpen, ShieldX } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Logo } from "@/components/layout/logo";
import { CreatorCredit } from "@/components/layout/creator-credit";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { certificateGoals } from "@/lib/certificates";
import { db } from "@/lib/db";
import { sdg } from "@/lib/sdg";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify a certificate", robots: { index: false, follow: false } };

const CODE = /^SIH-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** Public page opened by the QR code: confirms a volunteer certificate is genuine. */
export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).trim().toUpperCase();
  const cert = CODE.test(code) ? await db.certificate.findUnique({ where: { code } }) : null;
  const newer = cert ? await db.certificate.findFirst({ where: { userId: cert.userId, issuedAt: { gt: cert.issuedAt }, revokedAt: null }, select: { id: true } }) : null;
  const valid = cert && !cert.revokedAt;

  // Extra proof for whoever checks it: the volunteer's public profile and the projects behind the hours
  // (verified before this certificate was issued). No email or other private details are shown.
  const [owner, byProject] = cert
    ? await Promise.all([
        db.user.findUnique({ where: { id: cert.userId }, select: { image: true, status: true, profile: { select: { username: true, isPublic: true, headline: true } } } }),
        db.impactSubmission.groupBy({
          by: ["projectId"],
          where: { userId: cert.userId, status: "VERIFIED", projectId: { not: null }, OR: [{ reviewedAt: { lte: cert.issuedAt } }, { reviewedAt: null, createdAt: { lte: cert.issuedAt } }] },
          _sum: { hours: true },
          orderBy: { _sum: { hours: "desc" } },
        }),
      ])
    : [null, []];
  const projects = byProject.length
    ? await db.project.findMany({ where: { id: { in: byProject.map((b) => b.projectId!) }, moderationStatus: "APPROVED" }, select: { id: true, slug: true, title: true } })
    : [];
  const projectRows = byProject.flatMap((b) => {
    const pr = projects.find((x) => x.id === b.projectId);
    return pr ? [{ ...pr, hours: toNumber(b._sum.hours) }] : [];
  });
  const publicProfile = owner?.status === "ACTIVE" && owner.profile?.isPublic ? owner.profile : null;
  const checkedAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

  return (
    <div lang="en" className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center"><Logo /></header>
      <main className="container-page flex flex-1 items-start justify-center py-8">
        <div className="w-full max-w-xl overflow-hidden rounded-[var(--radius-2xl)] bg-surface shadow-raised">
          {!cert ? (
            <div className="p-8 text-center">
              <ShieldX className="mx-auto size-12 text-danger" aria-hidden />
              <h1 className="mt-4 text-2xl font-bold">Certificate not found</h1>
              <p className="mt-2 text-ink-muted">
                There is no SDG Impact Hub certificate with the ID <span className="font-mono font-semibold text-ink">{code || "—"}</span>. Check the ID on the certificate and try again.
              </p>
            </div>
          ) : (
            <>
              <div className={valid ? "bg-mint px-8 py-6 text-center" : "bg-danger-soft px-8 py-6 text-center"}>
                {valid ? <BadgeCheck className="mx-auto size-12 text-link" aria-hidden /> : <CircleAlert className="mx-auto size-12 text-danger" aria-hidden />}
                <h1 className="mt-3 text-2xl font-bold">{valid ? "Valid certificate" : "This certificate was revoked"}</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {valid ? `Issued by SDG Impact Hub. Checked against our records just now (${checkedAt}, Bangkok time).` : `Revoked on ${formatDate(cert.revokedAt!)}. It should no longer be relied on.`}
                </p>
              </div>
              <dl className="divide-y divide-border px-8">
                {[
                  ["Volunteer", cert.name],
                  ["Verified hours", `${formatNumber(toNumber(cert.hours))} hours`],
                  ["Activities", `${cert.activities}${cert.projects ? ` across ${cert.projects} ${cert.projects === 1 ? "project" : "projects"}` : ""}`],
                  ...(cert.peopleReached > 0 ? [["People reached", cert.peopleReached.toLocaleString("en-US")]] : []),
                  ...(cert.periodStart && cert.periodEnd ? [["Period", `${formatDate(cert.periodStart, { month: "long", year: "numeric" })} – ${formatDate(cert.periodEnd, { month: "long", year: "numeric" })}`]] : []),
                  ["Date issued", formatDate(cert.issuedAt, { day: "numeric", month: "long", year: "numeric" })],
                  ["Certificate ID", cert.code],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className={k === "Certificate ID" ? "font-mono font-semibold" : "text-right font-semibold"}>{v}</dd>
                  </div>
                ))}
              </dl>
              {publicProfile && (
                <div className="px-8 pb-2 pt-4">
                  <Link href={`/u/${publicProfile.username}`} className="group flex items-center gap-3 rounded-[16px] border border-border p-3 transition-colors hover:border-accent hover:bg-mint/40">
                    <Avatar name={cert.name} src={owner?.image} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{cert.name}</span>
                      <span className="block truncate text-xs text-ink-muted">@{publicProfile.username}{publicProfile.headline ? ` · ${publicProfile.headline}` : ""}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-link">View profile <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
                  </Link>
                </div>
              )}
              {projectRows.length > 0 && (
                <div className="px-8 pb-2 pt-4">
                  <p className="text-sm text-ink-muted">Projects</p>
                  <ul className="mt-2 divide-y divide-border">
                    {projectRows.map((pr) => (
                      <li key={pr.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <FolderOpen className="size-4 shrink-0 text-ink-subtle" aria-hidden />
                        <Link href={`/projects/${pr.slug}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">{pr.title}</Link>
                        <span className="shrink-0 text-ink-muted">{formatNumber(pr.hours)} h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {certificateGoals(cert.goals).length > 0 && (
                <div className="px-8 pb-6 pt-2">
                  <p className="text-sm text-ink-muted">Goals contributed to</p>
                  <ul className="mt-3 flex flex-wrap gap-3">
                    {certificateGoals(cert.goals).map((g) => (
                      <li key={g.goalId} className="flex items-center gap-2 text-sm">
                        <SdgTile goal={g.goalId} className="size-9 rounded-[8px]" />
                        <span><span className="font-semibold">{sdg(g.goalId).shortTitle}</span> · {formatNumber(g.hours)} h</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {valid && newer && (
                <p className="border-t border-border bg-canvas px-8 py-4 text-sm text-ink-muted">
                  This volunteer has earned a newer certificate since this one was issued. The details above were correct on the date issued.
                </p>
              )}
              <p className="border-t border-border px-8 py-4 text-xs text-ink-muted">
                Only hours confirmed by project organizers or administrators are counted. <Link href="/" className="font-semibold text-link hover:underline">About SDG Impact Hub</Link>
              </p>
            </>
          )}
        </div>
      </main>
      <footer className="container-page pb-8 pt-4"><CreatorCredit /></footer>
    </div>
  );
}
