"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/server/actions/auth";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);

  if (done)
    return (
      <div className="mt-8 space-y-5">
        <p className="flex items-center gap-2 rounded-[10px] bg-mint px-3 py-3 text-sm font-medium text-forest-900" role="status">
          <CircleCheck className="size-5" /> {done}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );

  return (
    <form
      className="mt-8 space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) return setFieldError("Passwords don't match");
        setFieldError(undefined);
        start(async () => {
          const res = await resetPasswordAction({ token, password });
          if (res.ok) setDone(res.message ?? "Password updated");
          else {
            setError(res.error);
            setFieldError(res.fieldErrors?.password);
          }
        });
      }}
    >
      {!token && <FormError message="This link is missing its token. Request a new reset link." />}
      <FormError message={error} />
      <Field label="New password" htmlFor="password" hint="At least 8 characters, with a letter and a number." required>
        <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={fieldError} required>
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!token}>
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Choose a new password</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="mt-8 text-sm">
        <Link href="/forgot-password" className="font-semibold text-link hover:underline">
          Request a new link
        </Link>
      </p>
    </div>
  );
}
