import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** Admin CSV reports: impact, projects, users. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const type = req.nextUrl.searchParams.get("type");
  let body: string;
  if (type === "projects") {
    const ps = await db.project.findMany({ include: { goals: true, organization: { select: { name: true } }, _count: { select: { members: true } } }, orderBy: { createdAt: "desc" } });
    const hours = await db.impactSubmission.groupBy({ by: ["projectId"], where: { status: "VERIFIED", projectId: { not: null } }, _sum: { hours: true } });
    body = csv([
      ["Project", "Organization", "Goals", "Status", "Moderation", "City", "Members", "Verified hours", "Progress %", "Funding goal", "Raised", "Created"],
      ...ps.map((p) => [p.title, p.organization?.name ?? "", p.goals.map((g) => g.goalId).join(" "), p.status, p.moderationStatus, p.isOnline ? "Online" : p.city, p._count.members, toNumber(hours.find((h) => h.projectId === p.id)?._sum.hours), p.progress, toNumber(p.fundingGoal), toNumber(p.fundsRaised), p.createdAt.toISOString().slice(0, 10)]),
    ]);
  } else if (type === "users") {
    const us = await db.user.findMany({ include: { profile: true, _count: { select: { impactSubmissions: true, projectMemberships: true } } }, orderBy: { createdAt: "desc" } });
    body = csv([["Name", "Username", "Role", "Status", "Email verified", "City", "XP", "Submissions", "Projects", "Joined"], ...us.map((u) => [u.name, u.profile?.username, u.role, u.status, u.emailVerified ? "yes" : "no", u.profile?.city, u.xp, u._count.impactSubmissions, u._count.projectMemberships, u.createdAt.toISOString().slice(0, 10)])]);
  } else {
    const subs = await db.impactSubmission.findMany({ include: { user: { select: { name: true } }, project: { select: { title: true } }, values: { include: { metric: true } } }, orderBy: { date: "desc" } });
    body = csv([["Date", "Volunteer", "Activity", "Project", "Goal", "Hours", "Status", "Outcomes"], ...subs.map((s) => [s.date.toISOString().slice(0, 10), s.user.name, s.title, s.project?.title, s.goalId, toNumber(s.hours), s.status, s.values.map((v) => `${v.value} ${v.metric.unit} ${v.metric.name}`).join("; ")])]);
  }
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sdg-${type ?? "impact"}-report.csv"`, "Cache-Control": "private, no-store" } });
}
