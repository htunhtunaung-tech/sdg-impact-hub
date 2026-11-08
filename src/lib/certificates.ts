import { randomInt } from "node:crypto";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { peopleReached } from "@/server/queries/impact";

/** Letters and digits without look-alikes (no 0/O, 1/I/L). */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `SIH-${part()}-${part()}`;
}

export type CertificateGoal = { goalId: number; hours: number };

/** Live totals of a volunteer's verified impact. */
async function verifiedSummary(userId: string) {
  const where = { userId, status: "VERIFIED" as const };
  const [agg, goals, first, last, projects, people] = await Promise.all([
    db.impactSubmission.aggregate({ where, _sum: { hours: true }, _count: true }),
    db.impactSubmission.groupBy({ by: ["goalId"], where, _sum: { hours: true }, orderBy: { _sum: { hours: "desc" } } }),
    db.impactSubmission.findFirst({ where, orderBy: { date: "asc" }, select: { date: true } }),
    db.impactSubmission.findFirst({ where, orderBy: { date: "desc" }, select: { date: true } }),
    db.impactSubmission.findMany({ where: { ...where, projectId: { not: null } }, distinct: ["projectId"], select: { projectId: true } }),
    peopleReached(where),
  ]);
  return {
    hours: toNumber(agg._sum.hours),
    activities: agg._count,
    projects: projects.length,
    peopleReached: Math.round(toNumber(people)),
    goals: goals.map((g) => ({ goalId: g.goalId, hours: toNumber(g._sum.hours) })) as CertificateGoal[],
    periodStart: first?.date ?? null,
    periodEnd: last?.date ?? null,
  };
}

/**
 * Returns the volunteer's current certificate. A new one (with a new random code) is issued only
 * when their verified hours or activity count have changed since the last one, so codes stay stable.
 * Returns null when there are no verified hours yet.
 */
export async function currentCertificate(userId: string, name: string) {
  const live = await verifiedSummary(userId);
  if (live.hours <= 0) return null;
  const latest = await db.certificate.findFirst({ where: { userId, revokedAt: null }, orderBy: { issuedAt: "desc" } });
  if (latest && toNumber(latest.hours) === live.hours && latest.activities === live.activities && latest.name === name) return latest;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.certificate.create({
        data: { code: randomCode(), userId, name, ...live, goals: live.goals as unknown as Prisma.InputJsonValue },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // code collision: try another
      throw e;
    }
  }
  throw new Error("Could not issue a certificate code.");
}

export function certificateGoals(goals: unknown): CertificateGoal[] {
  return Array.isArray(goals) ? (goals as CertificateGoal[]).filter((g) => Number.isInteger(g?.goalId)) : [];
}

/** Absolute base URL of the site, from APP_URL or the current request. */
export async function siteUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** QR code as an inline SVG string (dark green on transparent), generated on the server. */
export async function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f3d2a", light: "#0000" } });
}
