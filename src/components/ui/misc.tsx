import * as React from "react";
import Image from "next/image";
import { cn, initials } from "@/lib/utils";

export function Progress({ value, className, color, label }: { value: number; className?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-track", className)}
    >
      <div className="bar-fill h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint-strong font-semibold text-forest-900", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      aria-hidden={!src}
    >
      {src ? <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" unoptimized={src.startsWith("/api/")} /> : initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/70", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface/70 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-tone-mint text-link [&_svg]:size-6">{icon}</div>}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

export function IconBubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-link [&_svg]:size-5", className)}>{children}</span>;
}

export type Tone = "mint" | "sky" | "sun" | "rose" | "lilac" | "white";
const TONE_BG: Record<Tone, string> = {
  mint: "bg-tone-mint", sky: "bg-tone-sky", sun: "bg-tone-sun", rose: "bg-tone-rose", lilac: "bg-tone-lilac", white: "bg-surface border border-border/80 shadow-card",
};
const TONE_ICON: Record<Tone, string> = {
  mint: "text-forest-800", sky: "text-sky-800", sun: "text-amber-800", rose: "text-rose-800", lilac: "text-violet-800", white: "text-link",
};

/**
 * Metric tile. Pastel tones (TaskFlow-style) for headline numbers; the trend line uses an icon
 * as well as colour so a rise or fall is never communicated by colour alone.
 */
export function Stat({
  icon,
  label,
  value,
  sub,
  trend,
  tone = "white",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: "up" | "down" | null;
  tone?: Tone;
}) {
  return (
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] p-4 sm:p-5", TONE_BG[tone])}>
      <div className="flex items-center gap-2.5">
        <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/85 [&_svg]:size-[18px] sm:size-10", TONE_ICON[tone], tone === "white" && "bg-mint")}>{icon}</span>
        <span className="line-clamp-2 min-w-0 text-[13px] font-medium leading-tight text-ink-muted sm:text-sm">{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tracking-tight text-ink sm:mt-4 sm:text-[34px]">{value}</div>
      {sub && (
        <div className={cn("mt-2 truncate text-[13px]", trend === "up" ? "font-semibold text-link" : trend === "down" ? "font-semibold text-danger" : "text-ink-muted")}>{sub}</div>
      )}
    </div>
  );
}

/** Small "insight" row: icon in a soft circle, title and one line of context (TaskFlow "Quick insights"). */
export function InsightRow({ icon, title, sub, href }: { icon: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug text-ink">{title}</span>
        {sub && <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{sub}</span>}
      </span>
    </>
  );
  return href ? (
    <a href={href} className="group flex items-start gap-3 rounded-[14px] p-2 -mx-2 transition-colors hover:bg-canvas">{body}</a>
  ) : (
    <div className="flex items-start gap-3">{body}</div>
  );
}
