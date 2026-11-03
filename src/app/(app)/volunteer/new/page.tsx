import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { OpportunityForm } from "./opportunity-form";

export const metadata: Metadata = { title: "New volunteer opportunity" };

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const user = await requireUser("/volunteer/new");
  const { projectId } = await searchParams;
  const projects = await db.project.findMany({
    where: {
      moderationStatus: "APPROVED",
      status: { not: "COMPLETED" },
      ...(user.role === "ADMIN" ? {} : { OR: [{ organizerId: user.id }, { members: { some: { userId: user.id, role: { in: ["ORGANIZER", "COORDINATOR"] } } } }, { organization: { members: { some: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } } } } }] }),
    },
    include: { goals: { where: { isPrimary: true } } },
    orderBy: { title: "asc" },
  });
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="New volunteer opportunity" description="A specific session or shift people can sign up for." />
      {projects.length ? (
        <OpportunityForm
          projects={projects.map((p) => ({ id: p.id, title: p.title, goalId: p.goals[0]?.goalId ?? 17, isOnline: p.isOnline, locationName: p.locationName ?? "", city: p.city ?? "", lat: p.latitude, lng: p.longitude }))}
          defaultProjectId={projects.some((p) => p.id === projectId) ? projectId! : projects[0]!.id}
        />
      ) : (
        <EmptyState title="You don't manage an approved project yet" description="Opportunities belong to a project. Start one (or wait for approval), then come back." action={<Button asChild><Link href="/projects/new">Start a project</Link></Button>} />
      )}
    </div>
  );
}
