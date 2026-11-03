import "server-only";
import { createHash, randomBytes } from "crypto";
import type { TokenType } from "@prisma/client";
import { db } from "@/lib/db";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

export async function createEmailToken(userId: string, type: TokenType, ttlMinutes: number) {
  const raw = randomBytes(32).toString("base64url");
  await db.emailToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.emailToken.create({
    data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) },
  });
  return raw;
}

/** Marks the token used and returns its user id, or null if invalid/expired/used. */
export async function consumeEmailToken(raw: string, type: TokenType) {
  const token = await db.emailToken.findUnique({ where: { tokenHash: hash(raw) } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) return null;
  const updated = await db.emailToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: new Date() } });
  return updated.count === 1 ? token.userId : null;
}
