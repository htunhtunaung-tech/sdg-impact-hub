"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { verifyEmailAction } from "@/server/actions/auth";

export function VerifyEmailButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  if (state?.ok)
    return (
      <div className="space-y-5">
        <p className="flex items-center gap-2 rounded-[10px] bg-mint px-3 py-3 text-sm font-medium text-forest-900" role="status">
          <CircleCheck className="size-5" /> {state.msg}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  return (
    <div className="space-y-4">
      <FormError message={state?.msg} />
      <Button
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await verifyEmailAction(token);
            setState(res.ok ? { ok: true, msg: res.message ?? "Confirmed" } : { ok: false, msg: res.error });
          })
        }
      >
        Confirm my email
      </Button>
    </div>
  );
}
