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
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${v}%`, background: color }} />
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
    <div className={cn("flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-mint text-link [&_svg]:size-6">{icon}</div>}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
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
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[32px] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

export function IconBubble({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mint text-link [&_svg]:size-5", className)}>{children}</span>;
}

export function Stat({
  icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: "up" | null;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-3">
        <IconBubble className="size-9 sm:size-10">{icon}</IconBubble>
        <span className="text-sm text-ink-muted sm:text-[15px]">{label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[32px]">{value}</div>
      {sub && <div className={cn("mt-2 text-[13px]", trend === "up" ? "font-semibold text-link" : "text-ink-muted")}>{sub}</div>}
    </div>
  );
}
