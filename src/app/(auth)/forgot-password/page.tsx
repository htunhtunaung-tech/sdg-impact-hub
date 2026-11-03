"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/server/actions/auth";

export default function ForgotPasswordPage() {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ msg: string; devLink?: string } | null>(null);

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-ink-muted">Enter your email and we'll send you a reset link.</p>
      {done ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center shadow-card" role="status">
          <MailCheck className="mx-auto size-8 text-link" />
          <p className="mt-3 text-sm text-ink-muted">{done.msg}</p>
          {done.devLink && (
            <p className="mt-4 text-xs text-ink-muted">
              Dev mode:{" "}
              <Link className="font-semibold text-link underline" href={done.devLink}>
                open reset link
              </Link>
            </p>
          )}
        </div>
      ) : (
        <form
          className="mt-8 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await forgotPasswordAction({ email });
              if (res.ok) setDone({ msg: res.message ?? "", devLink: res.data?.devLink });
              else setError(res.fieldErrors?.email ?? res.error);
            });
          }}
        >
          <FormError message={error} />
          <Field label="Email" htmlFor="email" required>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Send reset link
          </Button>
        </form>
      )}
      <p className="mt-8 text-sm">
        <Link href="/login" className="font-semibold text-link hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
