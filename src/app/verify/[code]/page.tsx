import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleAlert, ShieldX } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { CreatorCredit } from "@/components/layout/creator-credit";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { certificateGoals } from "@/lib/certificates";
import { db } from "@/lib/db";
import { sdg } from "@/lib/sdg";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify a certificate", robots: { index: false, follow: false } };

const CODE = /^SIH-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** Public page opened by the QR code: confirms a volunteer certificate is genuine. */
export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).trim().toUpperCase();
  const cert = CODE.test(code) ? await db.certificate.findUnique({ where: { code } }) : null;
  const newer = cert ? await db.certificate.findFirst({ where: { userId: cert.userId, issuedAt: { gt: cert.issuedAt }, revokedAt: null }, select: { id: true } }) : null;
  const valid = cert && !cert.revokedAt;

  return (
    <div lang="en" className="flex min-h-dvh flex-col bg-canvas">
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
                  {valid ? "Issued by SDG Impact Hub. The details below match our records." : `Revoked on ${formatDate(cert.revokedAt!)}. It should no longer be relied on.`}
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
