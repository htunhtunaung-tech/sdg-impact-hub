import { db } from "@/lib/db";
import { randomSuffix, slugify } from "@/lib/utils";

export async function uniqueUsername(base: string) {
  const root = slugify(base).replace(/-/g, "_").slice(0, 20) || "member";
  let candidate = root.length >= 3 ? root : `${root}_member`;
  for (let i = 0; i < 6; i++) {
    const taken = await db.userProfile.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${root}_${randomSuffix(4)}`;
  }
  return `${root}_${randomSuffix(8)}`;
}

export async function ensureProfile(userId: string, displayName: string) {
  const existing = await db.userProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.userProfile.create({ data: { userId, username: await uniqueUsername(displayName) } });
}
