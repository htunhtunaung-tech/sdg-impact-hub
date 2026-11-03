import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { projectVisibilityWhere } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { SDGS } from "@/lib/sdg";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const user = await getCurrentUser();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`search:${user?.id ?? ip}`, 60, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const contains = { contains: q, mode: "insensitive" as const };
  const num = Number(q.replace(/^(goal|sdg)\s*/i, ""));
  const goals = SDGS.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()) || g.shortTitle.toLowerCase().includes(q.toLowerCase()) || g.id === num).slice(0, 4);

  const [projects, opps, orgs, people] = await Promise.all([
    db.project.findMany({
      where: { AND: [projectVisibilityWhere(user), { OR: [{ title: contains }, { summary: contains }, { city: contains }] }] },
      select: { id: true, slug: true, title: true, city: true, isOnline: true },
      take: 5,
    }),
    db.volunteerOpportunity.findMany({
      where: { status: "OPEN", startsAt: { gt: new Date() }, OR: [{ title: contains }, { locationName: contains }] },
      select: { id: true, title: true, locationName: true, goalId: true },
      take: 4,
    }),
    db.organization.findMany({ where: { OR: [{ name: contains }, { city: contains }] }, select: { id: true, slug: true, name: true, city: true }, take: 4 }),
    user
      ? db.user.findMany({
          where: { status: "ACTIVE", profile: { isPublic: true }, OR: [{ name: contains }, { profile: { username: contains } }] },
          select: { id: true, name: true, profile: { select: { username: true, headline: true } } },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...goals.map((g) => ({ type: "goal", id: String(g.id), title: `Goal ${g.id}: ${g.title}`, href: `/sdgs/${g.id}`, goal: g.id })),
    ...projects.map((p) => ({ type: "project", id: p.id, title: p.title, subtitle: p.isOnline ? "Online" : p.city ?? undefined, href: `/projects/${p.slug}` })),
    ...opps.map((o) => ({ type: "opportunity", id: o.id, title: o.title, subtitle: o.locationName, href: `/volunteer/${o.id}` })),
    ...orgs.map((o) => ({ type: "organization", id: o.id, title: o.name, subtitle: o.city ?? undefined, href: `/organizations/${o.slug}` })),
    ...people
      .filter((p) => p.profile)
      .map((p) => ({ type: "person", id: p.id, title: p.name, subtitle: p.profile?.headline ?? `@${p.profile?.username}`, href: `/u/${p.profile!.username}` })),
  ];
  return NextResponse.json({ results });
}
