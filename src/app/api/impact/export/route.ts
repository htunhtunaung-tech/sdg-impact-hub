import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { toNumber } from "@/lib/utils";

const DAYS: Record<string, number> = { "30d": 30, "90d": 90, "12m": 365, all: 0 };

/** Neutralise spreadsheet formula injection and quote CSV fields. */
function cell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const days = DAYS[req.nextUrl.searchParams.get("range") ?? "12m"] ?? 365;
  const rows = await db.impactSubmission.findMany({
    where: { userId: user.id, ...(days ? { date: { gte: new Date(Date.now() - days * 86400_000) } } : {}) },
    include: { project: { select: { title: true } }, values: { include: { metric: true } }, reviewedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });
  const header = ["Date", "Activity", "Project", "Goal", "Hours", "Status", "Verified by", "Verified at", "Outcomes", "Notes"];
  const lines = rows.map((r) =>
    [
      r.date.toISOString().slice(0, 10), r.title, r.project?.title ?? "", `Goal ${r.goalId}`, toNumber(r.hours),
      r.status === "PENDING" ? "Self-reported (pending)" : r.status === "VERIFIED" ? "Verified" : "Not verified",
      r.reviewedBy?.name ?? "", r.reviewedAt?.toISOString().slice(0, 10) ?? "",
      r.values.map((v) => `${v.value} ${v.metric.unit} ${v.metric.name}`).join("; "), r.description ?? "",
    ].map(cell).join(","),
  );
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="impact-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
