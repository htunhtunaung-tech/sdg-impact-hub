import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/layout/logo";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { peopleReached } from "@/server/queries/impact";
import { getCurrentUser } from "@/lib/session";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";
import { sdg, SDGS } from "@/lib/sdg";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Volunteer certificate",
  robots: { index: false },
};

/**
 * Printable volunteer certificate (English, A4 landscape). Counts verified hours only.
 * Visible to the volunteer and to administrators. "Download PDF" uses the browser's print-to-PDF.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== userId && viewer.role !== "ADMIN")) notFound();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) notFound();

  const where = { userId, status: "VERIFIED" as const };
  const [agg, goals, first, last, projects, peopleTotal] = await Promise.all([
    db.impactSubmission.aggregate({
      where,
      _sum: { hours: true },
      _count: true,
    }),
    db.impactSubmission.groupBy({
      by: ["goalId"],
      where,
      _sum: { hours: true },
      orderBy: { _sum: { hours: "desc" } },
    }),
    db.impactSubmission.findFirst({
      where,
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    db.impactSubmission.findFirst({
      where,
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    db.impactSubmission.findMany({
      where: { ...where, projectId: { not: null } },
      distinct: ["projectId"],
      select: { projectId: true },
    }),
    peopleReached(where),
  ]);
  const hours = toNumber(agg._sum.hours);
  const people = toNumber(peopleTotal);
  const name = user.name ?? user.email;
  const code = `SIH-${userId.slice(-6).toUpperCase()}-${Math.round(hours * 10)}`;
  const period =
    first && last
      ? formatDate(first.date, { month: "long", year: "numeric" }) ===
        formatDate(last.date, { month: "long", year: "numeric" })
        ? formatDate(first.date, { month: "long", year: "numeric" })
        : `${formatDate(first.date, { month: "long", year: "numeric" })} – ${formatDate(last.date, { month: "long", year: "numeric" })}`
      : null;

  const toolbar = (
    <div className="mx-auto mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 print:hidden">
      <Button variant="ghost" asChild>
        <Link href="/impact">
          <ArrowLeft /> Back to Impact
        </Link>
      </Button>
      {hours > 0 && <PrintButton />}
    </div>
  );

  if (hours <= 0) {
    return (
      <main lang="en" className="min-h-dvh bg-canvas p-4 sm:p-8">
        {toolbar}
        <div className="mx-auto max-w-xl rounded-[var(--radius-xl)] bg-surface p-8 text-center shadow-card">
          <LogoMark className="mx-auto size-12" />
          <h1 className="mt-4 text-2xl font-bold">No verified hours yet</h1>
          <p className="mt-2 text-ink-muted">
            Your certificate appears once a project organizer verifies at least
            one of your activities. Record your impact after you volunteer, then
            ask the organizer to verify it.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/impact/new">Record Your Impact</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      lang="en"
      className="min-h-dvh bg-canvas p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0"
    >
      {/* A4 landscape, edge to edge, colours kept when printing */}
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; } }`}</style>
      {toolbar}

      <article
        aria-label={`Volunteer certificate for ${name}`}
        className="certificate relative mx-auto max-w-[1060px] overflow-hidden rounded-[18px] bg-white shadow-raised sm:aspect-[297/210] print:h-[210mm] print:w-[297mm] print:max-w-none print:rounded-none print:shadow-none"
      >
        {/* SDG colour band, top and bottom */}
        <div className="absolute inset-x-0 top-0 flex h-2.5" aria-hidden>
          {SDGS.map((g) => (
            <span
              key={g.id}
              className="flex-1"
              style={{ background: g.color }}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-2.5" aria-hidden>
          {SDGS.map((g) => (
            <span
              key={g.id}
              className="flex-1"
              style={{ background: g.color }}
            />
          ))}
        </div>
        {/* Inner frame */}
        <div
          className="absolute inset-4 rounded-[12px] border border-forest-900/15 sm:inset-6 print:inset-[9mm]"
          aria-hidden
        />
        <div
          className="absolute inset-5 rounded-[10px] border border-forest-900/10 sm:inset-7 print:inset-[10.5mm]"
          aria-hidden
        />

        <div className="relative flex h-full flex-col items-center px-6 pb-10 pt-10 text-center sm:px-16 sm:pb-12 sm:pt-12 print:px-[22mm] print:pb-[16mm] print:pt-[16mm]">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-10" />
            <span className="text-sm font-bold tracking-tight text-forest-900">
              SDG Impact Hub
            </span>
          </div>

          <div className="my-auto flex flex-col items-center py-4">
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.32em] text-link">
              Certificate of Volunteering
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              This certificate is proudly presented to
            </p>
            <h1 className="mt-2 font-display text-[40px] leading-tight text-ink sm:text-[64px]">
              {name}
            </h1>
            <div
              className="mt-1 h-px w-48 bg-gradient-to-r from-transparent via-forest-900/40 to-transparent"
              aria-hidden
            />

            <p className="mx-auto mt-5 max-w-[640px] text-[15px] leading-relaxed text-ink-muted">
              in recognition of{" "}
              <strong className="text-ink">
                {formatNumber(hours)} verified volunteer hours
              </strong>{" "}
              across {agg._count} {agg._count === 1 ? "activity" : "activities"}
              {projects.length > 0
                ? ` in ${projects.length} ${projects.length === 1 ? "project" : "projects"}`
                : ""}
              {period ? `, ${period}` : ""}, contributing to the United Nations
              Sustainable Development Goals.
            </p>

            <ul
              className="mt-6 flex flex-wrap justify-center gap-3"
              aria-label="Goals contributed to"
            >
              {goals.slice(0, 6).map((g) => (
                <li
                  key={g.goalId}
                  className="flex w-[84px] flex-col items-center gap-1.5"
                >
                  <SdgTile goal={g.goalId} className="size-12 rounded-[10px]" />
                  <span className="text-[11px] font-semibold leading-tight text-ink">
                    {sdg(g.goalId).shortTitle}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-muted">
                    {formatNumber(toNumber(g._sum.hours))} h
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid w-full grid-cols-1 items-end gap-6 pt-8 text-xs text-ink-muted sm:grid-cols-3">
            <div className="sm:text-left">
              <p className="font-semibold text-ink">
                {formatDate(new Date(), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <div
                className="mx-auto mt-1 h-px w-40 bg-ink/25 sm:mx-0"
                aria-hidden
              />
              <p className="mt-1">Date issued</p>
            </div>
            <div>
              {people > 0 && (
                <p className="text-ink">
                  <strong>{Math.round(people).toLocaleString("en-US")}</strong>{" "}
                  people reached
                </p>
              )}
              <p className="mt-1">
                Only hours confirmed by project organizers or administrators are
                counted.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold text-ink">SDG Impact Hub</p>
              <div
                className="mx-auto mt-1 h-px w-40 bg-ink/25 sm:ml-auto sm:mr-0"
                aria-hidden
              />
              <p className="mt-1">
                Certificate ID{" "}
                <span className="font-mono text-ink">{code}</span>
              </p>
            </div>
          </div>
        </div>
      </article>
      <p className="mx-auto mt-4 max-w-[1060px] text-center text-sm text-ink-muted print:hidden">
        Tip: in the print window choose <strong>Save as PDF</strong>,{" "}
        <strong>Landscape</strong>, and turn on{" "}
        <strong>Background graphics</strong>.
      </p>
    </main>
  );
}
