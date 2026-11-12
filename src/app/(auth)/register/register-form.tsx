"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { GoalPicker } from "@/components/sdg/goal-picker";
import { registerAction } from "@/server/actions/auth";

const ROLES = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "STUDENT", label: "Student" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "ORGANIZER", label: "Project organizer" },
  { value: "ORGANIZATION", label: "NGO / Organization representative" },
  { value: "YOUTH_ORGANIZATION", label: "Youth organization representative" },
];

export function RegisterForm() {
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VOLUNTEER", goals: [] as number[] });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ message: string; devLink?: string } | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await registerAction(form);
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      } else {
        setDone({ message: res.message ?? "Check your inbox.", devLink: res.data?.devLink });
      }
    });
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center shadow-card">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-mint text-link">
          <MailCheck className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Confirm your email</h2>
        <p className="mt-1 text-sm text-ink-muted">{done.message}</p>
        {done.devLink && (
          <p className="mt-4 rounded-[14px] bg-canvas p-3 text-xs text-ink-muted">
            Dev mode (no SMTP configured):{" "}
            <Link href={done.devLink} className="font-semibold text-link underline">
              open confirmation link
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label="Full name" htmlFor="name" error={fieldErrors.name} required>
        <Input autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={fieldErrors.password} required>
        <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
      </Field>
      <Field label="I'm joining as" htmlFor="role" error={fieldErrors.role}>
        <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Goals you care about <span className="font-normal text-ink-subtle">(optional)</span></legend>
        <p className="mb-2 text-xs text-ink-subtle">We use these to recommend projects and opportunities.</p>
        <GoalPicker value={form.goals} onChange={(v) => set("goals", v)} compact />
      </fieldset>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-xs text-ink-subtle">
        By joining you agree to share only honest, accurate impact reports. See our <Link href="/help#privacy" className="underline">privacy notes</Link>.
      </p>
    </form>
  );
}
