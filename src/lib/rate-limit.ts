import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/action";

/**
 * Fixed-window rate limiter stored in Postgres so it works across server instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${now}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Throws a user-facing error when the limit is exceeded. Keyed by user id when given, else by IP. */
export async function enforceRateLimit(name: string, limit: number, windowSeconds: number, identity?: string) {
  const id = identity ?? (await clientIp());
  const allowed = await rateLimit(`${name}:${id}`, limit, windowSeconds);
  if (!allowed) throw new ActionError("You're doing that too often. Please wait a moment and try again.");
}
