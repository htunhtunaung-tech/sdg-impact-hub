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
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
