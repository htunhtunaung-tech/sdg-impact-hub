"use client";

import Link from "next/link";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

const track = "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[var(--color-track)] p-1";
const item =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-offset-0 data-[active=true]:bg-primary data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:shadow-[0_6px_16px_-6px_rgb(20_83_45/0.55)]";

/** URL-driven segmented control (Week / Month / Year). Server-friendly and shareable. */
export function LinkSegmented({
  items,
  active,
  label,
  className,
}: {
  items: { key: string; label: string; href: string }[];
  active: string;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn(track, className)}>
      {items.map((i) => {
        const on = i.key === active;
        return (
          <Link key={i.key} href={i.href} scroll={false} aria-current={on ? "page" : undefined} data-active={on} className={item}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Client-side segmented control (single choice), keyboard accessible via arrow keys. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn(track, className)}
    >
      {items.map((i) => (
        <ToggleGroup.Item key={i.value} value={i.value} data-active={i.value === value} className={item}>
          {i.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
