"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction, resendVerificationAction } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [unverified, setUnverified] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await loginAction({ email, password }, callbackUrl);
      if (res && !res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        setUnverified(Boolean(res.fieldErrors?._unverified));
      }
    });
  };

  const resend = () =>
    start(async () => {
      const res = await resendVerificationAction(email);
      if (res.ok) {
        toast.success(res.message ?? "Link sent");
        if (res.data?.devLink) toast.info("Dev mode: open the link from the server console or below.", { description: res.data.devLink, duration: 20000 });
      } else toast.error(res.error);
    });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={error} />
      {unverified && (
        <Button type="button" variant="secondary" className="w-full" onClick={resend} loading={pending}>
          Send a new confirmation link
        </Button>
      )}
      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.org" />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldErrors.password} required>
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-link hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
