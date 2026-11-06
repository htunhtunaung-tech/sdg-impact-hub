import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { FolderOpen, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { projectVisibilityWhere } from "@/lib/permissions";
import { recommendProjects } from "@/lib/recommendations";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { ProjectCard } from "@/components/projects/project-card";
import { Pagination } from "@/components/ui/pagination";
import { projectCardInclude, toProjectCard } from "@/server/queries/projects";
import { ProjectFilters } from "./project-filters";

export const metadata: Metadata = { title: "Projects" };

const PAGE_SIZE = 9;
type SP = { q?: string; goal?: string | string[]; city?: string; status?: string; sort?: string; view?: string; page?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const view = user && (sp.view === "mine" || sp.view === "saved") ? sp.view : "all";
  const goals = (Array.isArray(sp.goal) ? sp.goal : sp.goal ? [sp.goal] : []).map(Number).filter((n) => n >= 1 && n <= 17);
  const status = sp.status && ["PLANNING", "RECRUITING", "ACTIVE", "COMPLETED"].includes(sp.status) ? sp.status : sp.status === "any" ? null : view === "all" ? "OPEN" : null;
  const sort = ["relevant", "newest", "starting", "spots"].includes(sp.sort ?? "") ? sp.sort! : user ? "relevant" : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 80);

  const where: Prisma.ProjectWhereInput = {
    AND: [
      view === "all" ? { moderationStatus: "APPROVED" } : projectVisibilityWhere(user),
      view === "mine" && user ? { members: { some: { userId: user.id } } } : {},
      view === "saved" && user ? { saves: { some: { userId: user.id } } } : {},
      goals.length ? { goals: { some: { goalId: { in: goals } } } } : {},
      sp.city ? (sp.city === "online" ? { isOnline: true } : { city: sp.city }) : {},
      status === "OPEN" ? { status: { in: ["RECRUITING", "ACTIVE"] } } : status ? { status: status as never } : {},
      q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { organization: { name: { contains: q, mode: "insensitive" } } }] } : {},
    ],
  };

  const [total, cities] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({ where: { moderationStatus: "APPROVED", city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);

  let items;
  if (sort === "relevant" && user) {
    // Content-based ranking (followed goals, skills, distance) over the filtered set.
    const ranked = await recommendProjects(user, 500);
    const rank = new Map(ranked.map((r, i) => [r.id, i]));
    const all = await db.project.findMany({ where, include: projectCardInclude(user.id), take: 500 });
    all.sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6) || b.createdAt.getTime() - a.createdAt.getTime());
    items = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      sort === "starting" ? { startDate: "asc" } : sort === "spots" ? { volunteersNeeded: "desc" } : { createdAt: "desc" };
    items = await db.project.findMany({ where, include: projectCardInclude(user?.id), orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v == null) continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => params.append(k, x));
  }
  const tabHref = (v: string) => `/projects${v === "all" ? "" : `?view=${v}`}`;

  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader
        title="Projects"
        description={`${total} ${total === 1 ? "project" : "projects"} ${view === "all" ? "need volunteers near you and online" : view === "mine" ? "you're part of" : "saved for later"}.`}
        actions={
          <Button size="lg" asChild>
            <Link href={user ? "/projects/new" : "/login?callbackUrl=/projects/new"}>
              <Plus /> Start a project
            </Link>
          </Button>
        }
      />
      {user && (
        <LinkTabs
          className="mb-6"
          active={view}
          tabs={[
            { key: "all", label: "Discover", href: tabHref("all") },
            { key: "mine", label: "My projects", href: tabHref("mine") },
            { key: "saved", label: "Saved", href: tabHref("saved") },
          ]}
        />
      )}
      <ProjectFilters cities={cities.map((c) => c.city!)} signedIn={Boolean(user)} defaults={{ q: q ?? "", goals, city: sp.city ?? "", status: status ?? "any", sort }} />
      <p className="mb-4 mt-6 text-[15px] text-ink-muted">
        {total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} projects` : ""}
      </p>
      <h2 className="sr-only">Results</h2>
      {items.length ? (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <ProjectCard key={p.id} p={toProjectCard(p, user)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen />}
          title={view === "saved" ? "No saved projects" : view === "mine" ? "You haven't joined any projects" : "No projects match these filters"}
          description={view === "all" ? "Try removing a filter, or start the project your community needs." : "Browse projects and join one that fits your goals."}
          action={
            <Button variant="secondary" asChild>
              <Link href="/projects">{view === "all" ? "Clear all filters" : "Discover projects"}</Link>
            </Button>
          }
        />
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/projects" params={params.toString()} />
    </div>
  );
}
