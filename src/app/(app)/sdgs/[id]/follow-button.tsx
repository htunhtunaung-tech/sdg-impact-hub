"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { toggleFollowGoalAction } from "@/server/actions/profile";

export function FollowGoalButton({ goalId, following, signedIn, onColor }: { goalId: number; following: boolean; signedIn: boolean; onColor: string }) {
  const router = useRouter();
  const [state, setState] = useState(following);
  const [pending, start] = useTransition();
  const dark = onColor !== "#FFFFFF";
  return (
    <button
      type="button"
      aria-pressed={state}
      disabled={pending}
      onClick={() => {
        if (!signedIn) return router.push(`/login?callbackUrl=/sdgs/${goalId}`);
        start(async () => {
          setState(!state);
          const res = await toggleFollowGoalAction(goalId);
          if (!res.ok) {
            setState(state);
            toast.error(res.error);
          } else toast.success(res.message);
        });
      }}
      className="inline-flex h-11 items-center gap-2 rounded-[14px] border-2 px-4 text-sm font-semibold transition-colors disabled:opacity-70"
      style={{ borderColor: dark ? "#0F172A" : "#FFFFFF", color: dark ? "#0F172A" : "#FFFFFF", background: state ? (dark ? "rgba(15,23,42,.08)" : "rgba(255,255,255,.15)") : "transparent" }}
    >
      {state ? <Check className="size-4" /> : <Plus className="size-4" />} {state ? "Following" : "Follow this goal"}
    </button>
  );
}
