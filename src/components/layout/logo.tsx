import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The SDG Impact Hub emblem (globe, goal-colour ring and growing leaves). Decorative: the link carries the name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-9 shrink-0 overflow-hidden rounded-[12px] bg-forest-950 shadow-card", className)} aria-hidden>
      <Image src="/brand/logo-mark.png" alt="" fill sizes="44px" className="object-cover" priority />
    </span>
  );
}

export function Logo({ compact = false, iconOnly = false, href = "/" }: { compact?: boolean; iconOnly?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-[16px]" aria-label="SDG Impact Hub home">
      <LogoMark className={iconOnly ? "size-11 rounded-[14px]" : undefined} />
      {!iconOnly && <span className="text-[17px] font-bold tracking-tight text-ink">{compact ? "Impact Hub" : "SDG Impact Hub"}</span>}
    </Link>
  );
}
