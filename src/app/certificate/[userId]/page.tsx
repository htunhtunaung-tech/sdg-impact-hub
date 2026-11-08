import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { Button } from "@/components/ui/button";
import { certificateGoals, currentCertificate, qrSvg, siteUrl } from "@/lib/certificates";
import { db } from "@/lib/db";
import { sdg, SDGS } from "@/lib/sdg";
import { getCurrentUser } from "@/lib/session";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Volunteer certificate", robots: { index: false } };

const monthYear = (d: Date) => formatDate(d, { month: "long", year: "numeric" });

/**
 * Printable volunteer certificate (English, A4 landscape). Counts verified hours only.
 * Each issued certificate is saved with a random code; the QR code opens its public verification page.
 * Visible to the volunteer and to administrators. "Download PDF" uses the browser's print-to-PDF.
 */
export default async function CertificatePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== userId && viewer.role !== "ADMIN")) notFound();
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) notFound();

  const cert = await currentCertificate(userId, user.name ?? user.email);

  const toolbar = (
    <div className="mx-auto mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 print:hidden">
      <Button variant="ghost" asChild>
        <Link href="/impact"><ArrowLeft /> Back to Impact</Link>
      </Button>
      {cert && <PrintButton />}
    </div>
  );

  if (!cert) {
    return (
      <main lang="en" className="min-h-dvh bg-canvas p-4 sm:p-8">
        {toolbar}
        <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] bg-surface p-8 text-center shadow-card">
          <LogoMark className="mx-auto size-12" />
          <h1 className="mt-4 text-2xl font-bold">No verified hours yet</h1>
          <p className="mt-2 text-ink-muted">
            Your certificate appears once a project organizer verifies at least one of your activities. Record your impact after you volunteer, then ask the organizer to verify it.
          </p>
          <Button className="mt-6" asChild><Link href="/impact/new">Record Your Impact</Link></Button>
        </div>
      </main>
    );
  }

  const hours = toNumber(cert.hours);
  const goals = certificateGoals(cert.goals);
  const verifyUrl = `${await siteUrl()}/verify/${cert.code}`;
  const qr = await qrSvg(verifyUrl);
  const period =
    cert.periodStart && cert.periodEnd
      ? monthYear(cert.periodStart) === monthYear(cert.periodEnd)
        ? monthYear(cert.periodStart)
        : `${monthYear(cert.periodStart)} – ${monthYear(cert.periodEnd)}`
      : null;
  const band = (
    <>
      {SDGS.map((g) => <span key={g.id} className="flex-1" style={{ background: g.color }} />)}
    </>
  );

  return (
    <main lang="en" className="min-h-dvh bg-canvas p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
      {/* A4 landscape, edge to edge, colours kept when printing */}
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; } }`}</style>
      {toolbar}

      <article
        aria-label={`Volunteer certificate for ${cert.name}`}
        className="relative mx-auto max-w-[1060px] overflow-hidden rounded-[18px] bg-white shadow-raised sm:aspect-[297/210] print:h-[210mm] print:w-[297mm] print:max-w-none print:rounded-none print:shadow-none"
      >
        <div className="absolute inset-x-0 top-0 flex h-2.5" aria-hidden>{band}</div>
        <div className="absolute inset-x-0 bottom-0 flex h-2.5" aria-hidden>{band}</div>
        <div className="absolute inset-4 rounded-[12px] border border-forest-900/15 sm:inset-6 print:inset-[9mm]" aria-hidden />
        <div className="absolute inset-5 rounded-[10px] border border-forest-900/10 sm:inset-7 print:inset-[10.5mm]" aria-hidden />

        <div className="relative flex h-full flex-col items-center px-6 pb-10 pt-10 text-center sm:px-16 sm:pb-12 sm:pt-12 print:px-[22mm] print:pb-[16mm] print:pt-[16mm]">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-10" />
            <span className="text-sm font-bold tracking-tight text-forest-900">SDG Impact Hub</span>
          </div>

          <div className="my-auto flex flex-col items-center py-4">
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.32em] text-link">Certificate of Volunteering</p>
            <p className="mt-4 text-sm text-ink-muted">This certificate is proudly presented to</p>
            <h1 className="mt-2 font-display text-[40px] leading-tight text-ink sm:text-[64px]">{cert.name}</h1>
            <div className="mt-1 h-px w-48 bg-gradient-to-r from-transparent via-forest-900/40 to-transparent" aria-hidden />

            <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-relaxed text-ink-muted">
              in recognition of <strong className="text-ink">{formatNumber(hours)} verified volunteer hours</strong> across {cert.activities}{" "}
              {cert.activities === 1 ? "activity" : "activities"}
              {cert.projects > 0 ? ` in ${cert.projects} ${cert.projects === 1 ? "project" : "projects"}` : ""}
              {period ? `, ${period}` : ""}, contributing to the United Nations Sustainable Development Goals.
            </p>

            <ul className="mt-6 flex flex-wrap justify-center gap-3" aria-label="Goals contributed to">
              {goals.slice(0, 6).map((g) => (
                <li key={g.goalId} className="flex w-[84px] flex-col items-center gap-1.5">
                  <SdgTile goal={g.goalId} className="size-12 rounded-[10px]" />
                  <span className="text-[11px] font-semibold leading-tight text-ink">{sdg(g.goalId).shortTitle}</span>
                  <span className="text-[11px] tabular-nums text-ink-muted">{formatNumber(g.hours)} h</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid w-full grid-cols-1 items-end gap-6 pt-6 text-xs text-ink-muted sm:grid-cols-3">
            <div className="sm:text-left">
              <p className="font-semibold text-ink">{formatDate(cert.issuedAt, { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="mx-auto mt-1 h-px w-40 bg-ink/25 sm:mx-0" aria-hidden />
              <p className="mt-1">Date issued</p>
            </div>
            <div>
              {cert.peopleReached > 0 && (
                <p className="text-ink"><strong>{cert.peopleReached.toLocaleString("en-US")}</strong> people reached</p>
              )}
              <p className="mt-1">Only hours confirmed by project organizers or administrators are counted.</p>
            </div>
            <div className="flex items-end justify-center gap-3 sm:justify-end">
              <div className="sm:text-right">
                <p className="font-semibold text-ink">Scan to verify</p>
                <p className="mt-1">Certificate ID</p>
                <p className="font-mono text-[13px] font-semibold tracking-wide text-ink">{cert.code}</p>
              </div>
              <a
                href={verifyUrl}
                className="block size-[76px] shrink-0 rounded-[8px] bg-white p-1.5 ring-1 ring-forest-900/15 print:size-[22mm]"
                aria-label={`Verify this certificate online: ${verifyUrl}`}
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            </div>
          </div>
        </div>
      </article>
      <p className="mx-auto mt-4 max-w-[1060px] text-center text-sm text-ink-muted print:hidden">
        Anyone can check this certificate at <a className="font-semibold text-link underline-offset-4 hover:underline" href={verifyUrl}>{verifyUrl.replace(/^https?:\/\//, "")}</a>.
        <br />
        Tip: in the print window choose <strong>Save as PDF</strong>, <strong>Landscape</strong>, and turn on <strong>Background graphics</strong>.
      </p>
    </main>
  );
}
