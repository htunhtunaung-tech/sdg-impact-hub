import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { OrgDecision } from "../admin-actions";

export default async function AdminOrganizations() {
  const orgs = await db.organization.findMany({ include: { createdBy: { select: { name: true, email: true } }, _count: { select: { projects: true, members: true } } }, orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }] });
  if (!orgs.length) return <EmptyState title="No organizations" />;
  return (
    <Card className="divide-y divide-border">
      {orgs.map((o) => (
        <div key={o.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <Link href={`/organizations/${o.slug}`} className="hover:underline">{o.name}</Link>
              <Badge variant={o.verificationStatus === "VERIFIED" ? "success" : o.verificationStatus === "PENDING" ? "warning" : "danger"}>{o.verificationStatus.toLowerCase()}</Badge>
              <Badge variant="outline">{o.type.toLowerCase().replace("_", " ")}</Badge>
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{o.description}</p>
            <p className="mt-1 text-xs text-ink-subtle">Registered {formatDate(o.createdAt)} by {o.createdBy.name} ({o.createdBy.email}) · {o._count.projects} projects · {o._count.members} members{o.website && <> · <a href={o.website} target="_blank" rel="noopener noreferrer nofollow" className="text-link underline">website</a></>}</p>
          </div>
          <OrgDecision orgId={o.id} status={o.verificationStatus} />
        </div>
      ))}
    </Card>
  );
}
