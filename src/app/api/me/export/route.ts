import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

/** Data portability: everything tied to the signed-in account (no password hash, no tokens). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await rateLimit(`export:${user.id}`, 5, 3600))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const data = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, name: true, role: true, image: true, xp: true, currentStreak: true, longestStreak: true, createdAt: true,
      profile: true, sdgInterests: true, organizationMemberships: true, projectMemberships: true, savedProjects: true, applications: true,
      impactSubmissions: { include: { values: true } }, achievements: true, challengeParticipations: true, posts: true, comments: true,
      reactions: true, messagesSent: true, messagesReceived: true, notifications: true, reportsFiled: true, assistantThreads: { include: { messages: true } },
    },
  });
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), account: data }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="sdg-impact-hub-data.json"`, "Cache-Control": "private, no-store" },
  });
}
