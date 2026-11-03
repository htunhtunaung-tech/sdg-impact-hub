import "server-only";
import { db } from "@/lib/db";
import { haversineKm } from "@/lib/utils";

type RecUser = {
  id: string;
  profile: { skills: string[]; latitude: number | null; longitude: number | null } | null;
};

async function followedGoals(userId: string) {
  const rows = await db.userSdgInterest.findMany({ where: { userId }, select: { goalId: true } });
  return new Set(rows.map((r) => r.goalId));
}

const norm = (s: string) => s.trim().toLowerCase();

function locationScore(user: RecUser, lat: number | null, lng: number | null, isOnline: boolean) {
  if (isOnline) return { score: 1, distanceKm: null as number | null };
  const p = user.profile;
  if (p?.latitude == null || p.longitude == null || lat == null || lng == null) return { score: 0, distanceKm: null };
  const d = haversineKm({ lat: p.latitude, lng: p.longitude }, { lat, lng });
  return { score: d <= 25 ? 3 : d <= 100 ? 1.5 : d <= 300 ? 0.5 : -1, distanceKm: Math.round(d) };
}

/**
 * Content-based recommender: followed SDGs (+3 each), matching skills (+2 each),
 * proximity (up to +3), urgency of spots and start date. Transparent "reasons" are returned
 * so the UI can explain why something was suggested.
 */
export async function recommendOpportunities(user: RecUser, limit = 5) {
  const goals = await followedGoals(user.id);
  const skills = new Set((user.profile?.skills ?? []).map(norm));
  const opps = await db.volunteerOpportunity.findMany({
    where: { status: "OPEN", startsAt: { gt: new Date() }, applications: { none: { userId: user.id } } },
    include: {
      goal: { select: { id: true, shortTitle: true } },
      organization: { select: { name: true } },
      _count: { select: { applications: { where: { status: { in: ["APPROVED", "PENDING"] } } } } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });
  return opps
    .map((o) => {
      const reasons: string[] = [];
      let score = 0;
      if (goals.has(o.goalId)) {
        score += 3;
        reasons.push(`You follow Goal ${o.goalId}`);
      }
      const matched = o.skills.filter((s) => skills.has(norm(s)));
      if (matched.length) {
        score += 2 * matched.length;
        reasons.push(`Uses your skills: ${matched.join(", ")}`);
      }
      const loc = locationScore(user, o.latitude, o.longitude, o.isOnline);
      score += loc.score;
      if (loc.distanceKm != null && loc.distanceKm <= 100) reasons.push(`${loc.distanceKm} km away`);
      if (o.isOnline) reasons.push("Online");
      const spotsLeft = o.spots - o._count.applications;
      if (spotsLeft <= 0) score -= 2;
      const days = (o.startsAt.getTime() - Date.now()) / 86400_000;
      score += days < 14 ? 1 : 0;
      return { ...o, spotsLeft, score, reasons, distanceKm: loc.distanceKm };
    })
    .sort((a, b) => b.score - a.score || a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, limit);
}

export async function recommendProjects(user: RecUser, limit = 4) {
  const goals = await followedGoals(user.id);
  const skills = new Set((user.profile?.skills ?? []).map(norm));
  const projects = await db.project.findMany({
    where: {
      moderationStatus: "APPROVED",
      status: { in: ["RECRUITING", "ACTIVE", "PLANNING"] },
      members: { none: { userId: user.id } },
      organizerId: { not: user.id },
    },
    include: {
      goals: { include: { goal: { select: { id: true, shortTitle: true } } }, orderBy: { isPrimary: "desc" } },
      organization: { select: { name: true, verificationStatus: true } },
      _count: { select: { members: true } },
    },
    take: 200,
  });
  return projects
    .map((p) => {
      const reasons: string[] = [];
      let score = 0;
      const goalHits = p.goals.filter((g) => goals.has(g.goalId));
      if (goalHits.length) {
        score += 3 * goalHits.length;
        reasons.push(`Matches ${goalHits.map((g) => g.goal.shortTitle).join(", ")}`);
      }
      const matched = p.skillsNeeded.filter((s) => skills.has(norm(s)));
      if (matched.length) {
        score += 2 * matched.length;
        reasons.push(`Needs ${matched.join(", ")}`);
      }
      const loc = locationScore(user, p.latitude, p.longitude, p.isOnline);
      score += loc.score;
      if (loc.distanceKm != null && loc.distanceKm <= 100) reasons.push(`${loc.distanceKm} km away`);
      if (p.status === "RECRUITING") score += 1.5;
      if (p.organization?.verificationStatus === "VERIFIED") score += 0.5;
      return { ...p, score, reasons, distanceKm: loc.distanceKm };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
