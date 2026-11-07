import { unstable_rethrow } from "next/navigation";
import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseOrThrow<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ZodError } }, input: unknown): T {
  const res = schema.safeParse(input);
  if (!res.success) throw new ActionError("Please fix the highlighted fields.", zodFieldErrors(res.error));
  return res.data;
}

/** Wraps a server action body: maps known errors to a result, hides unexpected ones. */
export async function runAction<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof ActionError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    console.error("[action] unexpected error", err);
    return { ok: false, error: describeUnexpected(err) };
  }
}

/** Friendly text for unexpected failures, with a short reference code (never secrets) to help diagnose them. */
function describeUnexpected(err: unknown): string {
  const e = err as { code?: unknown; name?: unknown; message?: unknown };
  const code = typeof e?.code === "string" ? e.code : "";
  const name = typeof e?.name === "string" ? e.name : "Error";
  const msg = typeof e?.message === "string" ? e.message : "";
  if (code === "P2002") return "Something with these details already exists. Change the title and try again. (ref P2002)";
  if (code === "P2003" || code === "P2025") return `Something this links to no longer exists. Refresh the page and try again. (ref ${code})`;
  if (code === "P2000" || code === "P2020") return `One of the values is too long or too large. Shorten it and try again. (ref ${code})`;
  if (["P1001", "P1002", "P1008", "P1017", "P2024", "P2028"].includes(code) || /timed? ?out|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return `The database is busy right now. Please wait a few seconds and try again. (ref ${code || "timeout"})`;
  }
  return `Something went wrong. Please try again. (ref ${code || name})`;
}
