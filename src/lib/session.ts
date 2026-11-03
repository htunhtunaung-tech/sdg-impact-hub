import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/action";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, include: { profile: true } });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages: redirects to login when signed out. */
export async function requireUser(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  return user;
}

export async function requireAdminPage() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

/** For server actions / route handlers: throws a user-safe error. */
export async function requireActionUser() {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Please sign in to continue.");
  return user;
}

export async function requireActionAdmin() {
  const user = await requireActionUser();
  if (user.role !== "ADMIN") throw new ActionError("You don't have permission to do that.");
  return user;
}
