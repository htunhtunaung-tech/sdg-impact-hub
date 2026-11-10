"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { emails, sendEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createEmailToken, consumeEmailToken } from "@/lib/tokens";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation";
import { uniqueUsername } from "@/lib/profile";

const devLinks = () => process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST;
const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

function safeCallback(url: unknown) {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") ? url : "/dashboard";
}

export async function registerAction(input: unknown): Promise<ActionResult<{ devLink?: string }>> {
  return runAction(async () => {
    // Check the form first so typos don't use up attempts. The per-network limit is generous because
    // mobile carriers in Myanmar and Thailand put many phones behind one shared IP address.
    const data = parseOrThrow(registerSchema, input);
    const email = data.email.toLowerCase();
    await enforceRateLimit("register-ip", 30, 3600);
    await enforceRateLimit("register-email", 5, 3600, email);
    const existing = await db.user.findUnique({ where: { email } });
    const message = "Check your inbox — we've sent you a link to confirm your email.";
    if (existing) {
      // Don't reveal whether the address is registered; tell the owner instead.
      await sendEmail({
        to: email,
        subject: "Someone tried to create an account with your email",
        heading: "You already have an account",
        body: "Someone (hopefully you) tried to sign up with this email. You can sign in, or reset your password if you've forgotten it.",
        cta: { label: "Sign in", url: `${appUrl()}/login` },
      });
      return { ok: true, message };
    }
    const user = await db.user.create({
      data: {
        name: data.name,
        email,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 12),
        profile: { create: { username: await uniqueUsername(data.name) } },
        sdgInterests: { create: data.goals.map((goalId) => ({ goalId })) },
        activities: { create: { type: "JOINED_PLATFORM", message: "joined SDG Impact Hub" } },
      },
    });
    const token = await createEmailToken(user.id, "VERIFY_EMAIL", 60 * 24);
    await emails.verify(email, data.name, token);
    return { ok: true, message, data: devLinks() ? { devLink: `/verify-email?token=${token}` } : undefined };
  });
}

export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult<{ unverified?: boolean }>> {
  return runAction(async () => {
    const data = parseOrThrow(loginSchema, input);
    const email = data.email.toLowerCase();
    await enforceRateLimit("login", 10, 900, `${email}`);
    const user = await db.user.findUnique({ where: { email } });
    const invalid = new ActionError("That email and password don't match. Check them and try again.");
    if (!user?.passwordHash) {
      await bcrypt.compare(data.password, "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.dRtXJ1b8e3vN0cXjvO2o2xE9h0aS"); // equalise timing
      throw user ? new ActionError("This account uses Google sign-in. Continue with Google, or reset your password to add one.") : invalid;
    }
    if (!(await bcrypt.compare(data.password, user.passwordHash))) throw invalid;
    if (user.status !== "ACTIVE") throw new ActionError("This account has been suspended. Contact support if you think this is a mistake.");
    if (!user.emailVerified) return { ok: false, error: "Please confirm your email address first. We can send you a new link.", fieldErrors: { _unverified: "1" } };
    try {
      await signIn("credentials", { email, password: data.password, redirectTo: safeCallback(callbackUrl) });
    } catch (err) {
      if (err instanceof AuthError) throw invalid;
      throw err; // NEXT_REDIRECT on success
    }
    return { ok: true };
  });
}

export async function resendVerificationAction(emailInput: string): Promise<ActionResult<{ devLink?: string }>> {
  return runAction(async () => {
    const { email } = parseOrThrow(forgotPasswordSchema, { email: emailInput });
    await enforceRateLimit("resend-verify", 3, 3600, email.toLowerCase());
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    let devLink: string | undefined;
    if (user && !user.emailVerified) {
      const token = await createEmailToken(user.id, "VERIFY_EMAIL", 60 * 24);
      await emails.verify(user.email, user.name, token);
      if (devLinks()) devLink = `/verify-email?token=${token}`;
    }
    return { ok: true, message: "If that account needs confirming, a new link is on its way.", data: { devLink } };
  });
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  return runAction(async () => {
    await enforceRateLimit("verify-email", 20, 3600);
    const userId = await consumeEmailToken(String(token ?? ""), "VERIFY_EMAIL");
    if (!userId) throw new ActionError("This link is invalid or has expired. Request a new one from the sign-in page.");
    await db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
    return { ok: true, message: "Your email is confirmed. You can sign in now." };
  });
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<{ devLink?: string }>> {
  return runAction(async () => {
    const { email } = parseOrThrow(forgotPasswordSchema, input);
    await enforceRateLimit("forgot", 5, 3600);
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    let devLink: string | undefined;
    if (user && user.status === "ACTIVE") {
      const token = await createEmailToken(user.id, "RESET_PASSWORD", 60);
      await emails.reset(user.email, token);
      if (devLinks()) devLink = `/reset-password?token=${token}`;
    }
    return { ok: true, message: "If an account exists for that email, we've sent a reset link. It expires in 1 hour.", data: { devLink } };
  });
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const data = parseOrThrow(resetPasswordSchema, input);
    await enforceRateLimit("reset", 10, 3600);
    const userId = await consumeEmailToken(data.token, "RESET_PASSWORD");
    if (!userId) throw new ActionError("This reset link is invalid or has expired. Request a new one.");
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(data.password, 12), emailVerified: new Date() },
    });
    return { ok: true, message: "Your password has been updated. You can sign in now." };
  });
}

export async function googleSignInAction(callbackUrl?: string) {
  await signIn("google", { redirectTo: safeCallback(callbackUrl) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
