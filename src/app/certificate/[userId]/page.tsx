import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate, formatNumber, toNumber } from "@/lib/utils";
import { sdg, SDGS, sdgForeground } from "@/lib/sdg";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Volunteer certificate", robots: { index: false } };

/** Printable recognition certificate. Only counts verified hours. Visible to the volunteer and admins. */
export default async function CertificatePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== userId && viewer.role !== "ADMIN")) notFound();
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) notFound();
  const [agg, goals, first] = await Promise.all([
    db.impactSubmission.aggregate({ where: { userId, status: "VERIFIED" }, _sum: { hours: true }, _count: true }),
    db.impactSubmission.groupBy({ by: ["goalId"], where: { userId, status: "VERIFIED" }, _sum: { hours: true }, orderBy: { _sum: { hours: "desc" } } }),
    db.impactSubmission.findFirst({ where: { userId, status: "VERIFIED" }, orderBy: { date: "asc" }, select: { date: true } }),
  ]);
  const hours = toNumber(agg._sum.hours);
  const code = `SIH-${userId.slice(-6).toUpperCase()}-${Math.round(hours * 10)}`;
  return (
    <main className="min-h-dvh bg-canvas p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end print:hidden"><PrintButton /></div>
      <article className="relative mx-auto aspect-[1.414] max-w-4xl overflow-hidden rounded-[18px] border border-border bg-white p-10 shadow-raised print:rounded-none print:border-0 print:shadow-none sm:p-14">
        <div className="absolute inset-x-0 top-0 flex h-2">{SDGS.map((g) => <span key={g.id} className="flex-1" style={{ background: g.color }} />)}</div>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-link">SDG Impact Hub</p>
          <h1 className="mt-4 font-display text-4xl sm:text-6xl">Certificate of Volunteering</h1>
          <p className="mt-6 text-ink-muted">This certifies that</p>
          <p className="mt-2 font-display text-3xl italic sm:text-5xl">{user.name}</p>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-slate-700">
            contributed <strong>{formatNumber(hours)} verified volunteer hours</strong> across {agg._count} activities
            {first ? ` since ${formatDate(first.date, { month: "long", year: "numeric" })}` : ""}, advancing the UN Sustainable Development Goals.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {goals.slice(0, 6).map((g) => (
              <span key={g.goalId} className="rounded-md px-2.5 py-1 text-xs font-bold" style={{ background: sdg(g.goalId).color, color: sdgForeground(sdg(g.goalId).color) }}>
                Goal {g.goalId} · {formatNumber(toNumber(g._sum.hours))} h
              </span>
            ))}
          </div>
          <div className="mt-auto flex w-full items-end justify-between pt-8 text-left text-xs text-ink-muted">
            <span>Issued {formatDate(new Date())}</span>
            <span>Hours verified by project organizers and administrators.<br />Certificate ID {code}</span>
          </div>
        </div>
      </article>
    </main>
  );
}
