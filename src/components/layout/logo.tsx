import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex size-8 items-center justify-center rounded-[9px] bg-primary text-white", className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    </span>
  );
}

export function Logo({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-md" aria-label="SDG Impact Hub home">
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-ink">{compact ? "Impact Hub" : "SDG Impact Hub"}</span>
    </Link>
  );
}
