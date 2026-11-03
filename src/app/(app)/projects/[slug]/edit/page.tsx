import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canManageProject } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/components/projects/project-form";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Edit project" };

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/projects/${slug}/edit`);
  const p = await db.project.findUnique({ where: { slug }, include: { goals: true, impactTargets: true } });
  if (!p || !(await canManageProject(user, p.id))) notFound();
  const [orgs, metrics] = await Promise.all([
    db.organizationMember.findMany({ where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } }, include: { organization: true } }),
    db.impactMetric.findMany({ orderBy: { name: "asc" } }),
  ]);
  const orgOptions = orgs.map((m) => ({ id: m.organization.id, name: m.organization.name, verified: m.organization.verificationStatus === "VERIFIED" }));
  if (p.organizationId && !orgOptions.some((o) => o.id === p.organizationId)) {
    const o = await db.organization.findUnique({ where: { id: p.organizationId } });
    if (o) orgOptions.push({ id: o.id, name: o.name, verified: o.verificationStatus === "VERIFIED" });
  }
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="Edit project" description={p.title} />
      <ProjectForm
        projectId={p.id}
        organizations={orgOptions}
        metrics={metrics.map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
        initial={{
          title: p.title, summary: p.summary, description: p.description, objectives: p.objectives, tasks: p.tasks,
          goals: p.goals.map((g) => g.goalId), primaryGoal: p.goals.find((g) => g.isPrimary)?.goalId ?? p.goals[0]?.goalId ?? null,
          status: p.status, imageUrl: p.imageUrl, organizationId: p.organizationId ?? "",
          budget: p.budget != null ? String(toNumber(p.budget)) : "", fundingGoal: p.fundingGoal != null ? String(toNumber(p.fundingGoal)) : "",
          currency: p.currency, isOnline: p.isOnline, locationName: p.locationName ?? "", city: p.city ?? "", country: p.country ?? "",
          latitude: p.latitude, longitude: p.longitude, startDate: ymd(p.startDate), endDate: ymd(p.endDate), scheduleText: p.scheduleText ?? "",
          commitment: p.commitment ?? "", skillsNeeded: p.skillsNeeded, volunteersNeeded: String(p.volunteersNeeded),
          impactTargets: p.impactTargets.map((t) => ({ metricId: t.metricId, targetValue: String(t.targetValue) })),
        }}
      />
    </div>
  );
}
