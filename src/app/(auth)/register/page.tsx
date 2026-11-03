import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/session";
import { RegisterForm } from "./register-form";
import { GoogleButton } from "../google-button";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-ink-muted">It's free, and takes about a minute.</p>
      <div className="mt-8 space-y-5">
        {isGoogleEnabled && (
          <>
            <GoogleButton label="Sign up with Google" />
            <div className="flex items-center gap-3 text-xs text-ink-subtle">
              <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <RegisterForm />
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-link hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
