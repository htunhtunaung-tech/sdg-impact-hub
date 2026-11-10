"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFollowUserAction } from "@/server/actions/follows";

/**
 * Instagram-style follow button: "Follow" (or "Follow back" when they follow you) → "Following".
 * Hovering "Following" shows "Unfollow". Updates instantly and rolls back if the server says no.
 */
export function FollowButton({
  userId,
  following,
  followsYou = false,
  signedIn,
  size = "md",
  className,
}: {
  userId: string;
  following: boolean;
  followsYou?: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(following);
  const [pop, setPop] = useState(false);
  const [pending, start] = useTransition();

  const click = () => {
    if (!signedIn) return router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    const next = !on;
    setOn(next);
    if (next) {
      setPop(true);
      window.setTimeout(() => setPop(false), 450);
    }
    start(async () => {
      const res = await toggleFollowUserAction(userId);
      if (!res.ok) {
        setOn(!next);
        toast.error(res.error);
      } else router.refresh();
    });
  };

  const label = on ? "Following" : followsYou ? "Follow back" : "Follow";
  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={on}
      className={cn(
        "group/follow inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-95 disabled:cursor-wait",
        size === "sm" ? "h-9 min-w-[96px] px-3.5 text-sm" : "h-11 min-w-[120px] px-5 text-[15px]",
        on
          ? "border border-border-strong bg-surface text-ink hover:border-danger hover:text-danger"
          : "bg-primary text-white shadow-brand hover:bg-primary-hover",
        pop && "follow-pop",
        className,
      )}
    >
      {on ? <Check className="size-4 group-hover/follow:hidden" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
      <span className={cn(on && "group-hover/follow:hidden")}>{label}</span>
      {on && <span className="hidden group-hover/follow:inline">Unfollow</span>}
    </button>
  );
}
