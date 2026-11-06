import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Globe, Hourglass, Mail, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canManageOrganization } from "@/lib/permissions";
import { formatInt, formatNumber, toNumber } from "@/lib/utils";
import { Avatar, Stat } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectCard } from "@/components/projects/project-card";
import { PostCard, postInclude } from "@/components/community/post-card";
import { projectCardInclude, toProjectCard } from "@/server/queries/projects";
import { peopleReached } from "@/server/queries/impact";
import { OrgTeamManager } from "./team-manager";
import { Clock, FolderOpen, Users } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await db.organization.findUnique({ where: { slug: (await params).slug }, select: { name: true, description: true } });
  return { title: o?.name ?? "Organization", description: o?.description };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const org = await db.organization.findUnique({
    where: { slug },
    include: { members: { include: { user: { select: { id: true, name: true, image: true, profile: { select: { username: true } } } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!org) notFound();
  const canManage = await canManageOrganization(user, org.id);
  const isMember = user ? org.members.some((m) => m.userId === user.id) : false;
  if (org.verificationStatus !== "VERIFIED" && !canManage && !isMember) notFound();

  const where = { project: { organizationId: org.id }, status: "VERIFIED" as const };
  const [projects, hours, people, volunteers, posts] = await Promise.all([
    db.project.findMany({ where: { organizationId: org.id, moderationStatus: "APPROVED" }, include: projectCardInclude(user?.id), orderBy: { createdAt: "desc" } }),
    db.impactSubmission.aggregate({ where, _sum: { hours: true } }),
    peopleReached(where),
    db.impactSubmission.findMany({ where, distinct: ["userId"], select: { userId: true } }),
    db.post.findMany({ where: { organizationId: org.id, isHidden: false }, include: postInclude(user?.id), orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="container-page py-6 sm:py-8">
      {org.verificationStatus !== "VERIFIED" && (
        <p className="mb-4 flex items-center gap-2 rounded-[16px] bg-warning-soft p-3 text-sm text-warning"><Hourglass className="size-4" /> {org.verificationStatus === "PENDING" ? "Awaiting verification by an administrator. Only members can see this page." : "This organization wasn't verified."}</p>
      )}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={org.name} src={org.logoUrl} size={80} className="rounded-[18px] bg-sky-50 text-2xl text-info" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
            {org.name}
            {org.verificationStatus === "VERIFIED" && <Badge variant="success"><BadgeCheck /> Verified organization</Badge>}
          </h1>
          <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {org.city && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{[org.city, org.country].filter(Boolean).join(", ")}</span>}
            {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-link hover:underline"><Globe className="size-4" />Website</a>}
            {org.email && <a href={`mailto:${org.email}`} className="inline-flex items-center gap-1.5 text-link hover:underline"><Mail className="size-4" />{org.email}</a>}
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat tone="mint" icon={<FolderOpen />} label="Projects" value={projects.length} />
        <Stat tone="sky" icon={<Clock />} label="Verified hours" value={formatNumber(toNumber(hours._sum.hours))} />
        <Stat tone="sun" icon={<Users />} label="Volunteers" value={volunteers.length} />
        <Stat tone="lilac" icon={<Users />} label="People reached" value={formatInt(people)} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[15px] leading-relaxed text-slate-700">
              <p>{org.description}</p>
              {org.mission && <p className="rounded-[16px] bg-mint p-4 text-forest-900"><strong>Mission:</strong> {org.mission}</p>}
            </CardContent>
          </Card>
          <section>
            <h2 className="mb-4 text-xl font-semibold">Projects</h2>
            {projects.length ? <div className="grid gap-4 md:grid-cols-2">{projects.map((p) => <ProjectCard key={p.id} p={toProjectCard(p, user)} />)}</div> : <p className="text-sm text-ink-muted">No published projects yet.</p>}
          </section>
          {posts.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Latest updates</h2>
              <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} currentUserId={user?.id} />)}</div>
            </section>
          )}
        </div>
        <aside>
          <Card>
            <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {org.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.user.name} src={m.user.image} size={32} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {m.user.profile ? <Link href={`/u/${m.user.profile.username}`} className="font-medium hover:underline">{m.user.name}</Link> : m.user.name}
                    </span>
                    <Badge variant={m.role === "OWNER" ? "brand" : "neutral"}>{m.role.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
              {canManage && <OrgTeamManager orgId={org.id} members={org.members.filter((m) => m.role !== "OWNER").map((m) => ({ userId: m.userId, name: m.user.name }))} />}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
