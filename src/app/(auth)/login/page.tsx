import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";
import { GoogleButton } from "../google-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  if (await getCurrentUser()) redirect(callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/dashboard");
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-ink-muted">Sign in to keep track of your impact.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error === "AccessDenied" ? "This account can't sign in right now." : "Sign-in failed. Please try again."}
        </p>
      )}
      <div className="mt-8 space-y-5">
        {isGoogleEnabled && (
          <>
            <GoogleButton callbackUrl={callbackUrl} />
            <div className="flex items-center gap-3 text-xs text-ink-subtle">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        New to SDG Impact Hub?{" "}
        <Link href="/register" className="font-semibold text-link hover:underline">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-8 rounded-[12px] border border-dashed border-border-strong bg-surface p-4 text-[13px] text-ink-muted">
          <p className="font-semibold text-ink">Demo accounts</p>
          <p className="mt-1">Password for all: <code className="rounded bg-slate-100 px-1">Password123</code></p>
          <ul className="mt-2 space-y-0.5">
            <li>Volunteer — mya@example.org</li>
            <li>Project organizer — somchai@example.org</li>
            <li>Administrator — admin@sdgimpacthub.org</li>
          </ul>
        </div>
      )}
    </div>
  );
}
