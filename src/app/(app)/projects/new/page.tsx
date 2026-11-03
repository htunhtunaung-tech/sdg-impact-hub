import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/misc";
import { ProjectForm } from "@/components/projects/project-form";
import { emptyProject } from "@/components/projects/project-defaults";

export const metadata: Metadata = { title: "Start a project" };

export default async function NewProjectPage() {
  const user = await requireUser("/projects/new");
  const [orgs, metrics] = await Promise.all([
    db.organizationMember.findMany({ where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } }, include: { organization: true } }),
    db.impactMetric.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="Start a project" description="Bring people together around a goal. Independent projects are reviewed by an administrator before they go public." />
      <ProjectForm
        initial={{ ...emptyProject, city: user.profile?.city ?? "", country: user.profile?.country ?? "", latitude: user.profile?.latitude ?? null, longitude: user.profile?.longitude ?? null }}
        organizations={orgs.map((m) => ({ id: m.organization.id, name: m.organization.name, verified: m.organization.verificationStatus === "VERIFIED" }))}
        metrics={metrics.map((m) => ({ id: m.id, name: m.name, unit: m.unit }))}
      />
    </div>
  );
}
