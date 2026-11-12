import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, FolderOpen, MapPin, Plus, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Organizations" };

const TYPE: Record<string, string> = { NGO: "NGO", UNIVERSITY: "University", SCHOOL: "School", COMPANY: "Company", COMMUNITY_GROUP: "Community group", YOUTH_ORGANIZATION: "Youth organization", GOVERNMENT: "Government" };

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await getCurrentUser();
  const type = (await searchParams).type;
  const orgs = await db.organization.findMany({
    where: { ...(type && TYPE[type] ? { type: type as never } : {}), OR: [{ verificationStatus: "VERIFIED" }, ...(user ? [{ members: { some: { userId: user.id } } }] : [])] },
    include: { _count: { select: { projects: { where: { moderationStatus: "APPROVED" } }, members: true } } },
    orderBy: [{ verificationStatus: "desc" }, { name: "asc" }],
  });
  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader title="Organizations" description="NGOs, universities and community groups running projects on the hub." actions={<Button asChild><Link href={user ? "/organizations/new" : "/login?callbackUrl=/organizations/new"}><Plus /> Register an organization</Link></Button>} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/organizations" className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${!type ? "border-primary bg-primary text-white" : "border-border-strong bg-surface"}`}>All</Link>
        {Object.entries(TYPE).map(([k, l]) => (
          <Link key={k} href={`/organizations?type=${k}`} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${type === k ? "border-primary bg-primary text-white" : "border-border-strong bg-surface hover:bg-canvas"}`}>{l}</Link>
        ))}
      </div>
      {orgs.length ? (
        <ul className="reveal-group grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o) => (
            <li key={o.id}>
              <Link href={`/organizations/${o.slug}`} className="flex h-full flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card transition-shadow hover:shadow-raised">
                <div className="flex items-center gap-3">
                  <Avatar name={o.name} src={o.logoUrl} size={48} className="rounded-[16px] bg-sky-50 text-info" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold">{o.name}{o.verificationStatus === "VERIFIED" && <BadgeCheck className="size-4 shrink-0 text-link" aria-label="Verified" />}</p>
                    <p className="text-sm text-ink-muted">{TYPE[o.type]}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-700">{o.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  {o.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{o.city}</span>}
                  <span className="inline-flex items-center gap-1"><FolderOpen className="size-3.5" />{o._count.projects} projects</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" />{o._count.members} members</span>
                  {o.verificationStatus !== "VERIFIED" && <Badge variant="warning">{o.verificationStatus === "PENDING" ? "Pending verification" : "Not verified"}</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<Building2 />} title="No organizations found" />}
    </div>
  );
}
