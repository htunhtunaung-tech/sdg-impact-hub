import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { toNumber } from "@/lib/utils";

/**
 * Gamification rules — designed to reward quality, not volume:
 *  • Self-reported impact earns nothing until an organizer/admin verifies it.
 *  • Verified impact: 10 XP base + 10 XP/hour (capped at 8h per entry) + 10 XP if evidence was attached.
 *  • Challenges without evidence give small, once-per-period rewards with a daily cap.
 *  • Achievements are computed from verified data only.
 */
export const XP = {
  verifiedBase: 10,
  perVerifiedHour: 10,
  maxHoursPerEntry: 8,
  evidenceBonus: 10,
  dailyChallengeCap: 60,
};

export function xpForSubmission(hours: number, hasEvidence: boolean) {
  return XP.verifiedBase + Math.round(Math.min(hours, XP.maxHoursPerEntry) * XP.perVerifiedHour) + (hasEvidence ? XP.evidenceBonus : 0);
}

export function levelForXp(xp: number) {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1;
}
export function xpForLevel(level: number) {
  return (level - 1) ** 2 * 100;
}
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - floor, needed: next - floor, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Updates the streak for a day on which the user did a verified/quality action. */
export async function touchStreak(userId: string, when = new Date()) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { lastActiveDate: true, currentStreak: true, longestStreak: true } });
  if (!user) return;
  const today = dayKey(when);
  const last = user.lastActiveDate ? dayKey(user.lastActiveDate) : null;
  if (last === today) return;
  const yesterday = dayKey(new Date(when.getTime() - 86400_000));
  const streak = last === yesterday ? user.currentStreak + 1 : 1;
  await db.user.update({
    where: { id: userId },
    data: { lastActiveDate: new Date(today), currentStreak: streak, longestStreak: Math.max(streak, user.longestStreak) },
  });
}

export async function userStats(userId: string) {
  const [hoursAgg, verifiedCount, goals, projectsJoined, projectsLed, challenges, user] = await Promise.all([
    db.impactSubmission.aggregate({ where: { userId, status: "VERIFIED" }, _sum: { hours: true } }),
    db.impactSubmission.count({ where: { userId, status: "VERIFIED" } }),
    db.impactSubmission.findMany({ where: { userId, status: "VERIFIED" }, distinct: ["goalId"], select: { goalId: true } }),
    db.projectMember.count({ where: { userId } }),
    db.project.count({ where: { organizerId: userId, moderationStatus: "APPROVED" } }),
    db.challengeParticipation.count({ where: { userId, status: "COMPLETED" } }),
    db.user.findUnique({ where: { id: userId }, select: { longestStreak: true } }),
  ]);
  return {
    verified_hours: toNumber(hoursAgg._sum.hours),
    verified_submissions: verifiedCount,
    goals_contributed: goals.length,
    projects_joined: projectsJoined,
    projects_led: projectsLed,
    challenges_completed: challenges,
    streak_days: user?.longestStreak ?? 0,
  } as Record<string, number>;
}

/** Grants any achievements whose thresholds are now met. Returns newly earned names. */
export async function evaluateAchievements(userId: string) {
  const [stats, all, earned] = await Promise.all([
    userStats(userId),
    db.achievement.findMany(),
    db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const have = new Set(earned.map((e) => e.achievementId));
  const newly: string[] = [];
  for (const a of all) {
    if (have.has(a.id)) continue;
    if ((stats[a.criterion] ?? 0) < a.threshold) continue;
    try {
      await db.userAchievement.create({ data: { userId, achievementId: a.id } });
    } catch {
      continue; // unique race — already granted
    }
    if (a.xpReward) await db.user.update({ where: { id: userId }, data: { xp: { increment: a.xpReward } } });
    await db.activity.create({ data: { actorId: userId, type: "EARNED_ACHIEVEMENT", message: `earned the “${a.name}” badge` } });
    await notify(userId, { type: "ACHIEVEMENT_EARNED", title: `New badge: ${a.name}`, body: a.description, link: "/profile" });
    newly.push(a.name);
  }
  return newly;
}

/** XP already earned today from challenges — used to enforce the daily cap. */
export async function challengeXpToday(userId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const agg = await db.challengeParticipation.aggregate({
    where: { userId, completedAt: { gte: start } },
    _sum: { xpAwarded: true },
  });
  return agg._sum.xpAwarded ?? 0;
}

export function periodKeyFor(frequency: "DAILY" | "WEEKLY" | "ONE_TIME", d = new Date()) {
  if (frequency === "ONE_TIME") return "once";
  if (frequency === "DAILY") return dayKey(d);
  // ISO week
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
