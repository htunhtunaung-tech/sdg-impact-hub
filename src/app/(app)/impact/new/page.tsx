import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/misc";
import { ImpactForm } from "./impact-form";

export const metadata: Metadata = { title: "Record your impact" };

export default async function NewImpactPage({ searchParams }: { searchParams: Promise<{ opportunityId?: string; projectId?: string }> }) {
  const user = await requireUser("/impact/new");
  const sp = await searchParams;
  const [memberships, metrics, apps] = await Promise.all([
    db.projectMember.findMany({ where: { userId: user.id }, include: { project: { include: { goals: { where: { isPrimary: true } } } } } }),
    db.impactMetric.findMany({ orderBy: { name: "asc" } }),
    db.volunteerApplication.findMany({
      where: { userId: user.id, status: { in: ["APPROVED", "COMPLETED"] }, opportunity: { startsAt: { lt: new Date() } } },
      include: { opportunity: true },
      orderBy: { opportunity: { startsAt: "desc" } },
      take: 20,
    }),
  ]);
  const opp = apps.find((a) => a.opportunityId === sp.opportunityId)?.opportunity;
  const hours = opp ? Math.round(((opp.endsAt.getTime() - opp.startsAt.getTime()) / 3600_000) * 2) / 2 : 1;
  return (
    <div className="container-page max-w-2xl py-6 sm:py-8">
      <PageHeader title="Record your impact" description="Log what you did. It counts as self-reported until an organizer verifies it." />
      <ImpactForm
        projects={memberships.map((m) => ({ id: m.project.id, title: m.project.title, goalId: m.project.goals[0]?.goalId ?? 17 }))}
        opportunities={apps.map((a) => ({ id: a.opportunity.id, title: a.opportunity.title, projectId: a.opportunity.projectId, goalId: a.opportunity.goalId, date: a.opportunity.startsAt.toISOString().slice(0, 10), hours: Math.round(((a.opportunity.endsAt.getTime() - a.opportunity.startsAt.getTime()) / 3600_000) * 2) / 2 }))}
        metrics={metrics.map((m) => ({ id: m.id, name: m.name, unit: m.unit, goalId: m.goalId }))}
        initial={{
          opportunityId: opp?.id ?? "",
          projectId: opp?.projectId ?? (memberships.some((m) => m.projectId === sp.projectId) ? sp.projectId! : ""),
          goalId: opp?.goalId ?? memberships.find((m) => m.projectId === sp.projectId)?.project.goals[0]?.goalId ?? 13,
          title: opp?.title ?? "",
          date: (opp?.startsAt ?? new Date()).toISOString().slice(0, 10),
          hours: String(hours),
        }}
      />
    </div>
  );
}
