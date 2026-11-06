"use client";

import * as React from "react";
import { Slider as S, Switch as Sw } from "radix-ui";
import { cn } from "@/lib/utils";

/** Range or single-value slider with visible label and value. */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  format = (v: number) => String(v),
  className,
}: {
  label: string;
  value: number[];
  onValueChange: (v: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span id={id} className="font-medium text-ink">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value.map(format).join(" – ")}</span>
      </div>
      <S.Root value={value} onValueChange={onValueChange} min={min} max={max} step={step} aria-labelledby={id} className="relative flex h-6 touch-none select-none items-center">
        <S.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-[var(--color-track)]">
          <S.Range className="absolute h-full rounded-full bg-primary" />
        </S.Track>
        {value.map((_, i) => (
          <S.Thumb
            key={i}
            aria-label={value.length > 1 ? (i === 0 ? `${label} minimum` : `${label} maximum`) : label}
            className="block size-6 rounded-full border-[3px] border-white bg-primary shadow-raised transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        ))}
      </S.Root>
    </div>
  );
}

/** On/off switch with a visible label (the whole row is clickable). */
export function Switch({ label, description, checked, onCheckedChange, id }: { label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void; id?: string }) {
  const auto = React.useId();
  const sid = id ?? auto;
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={sid} className="cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-[13px] text-ink-muted">{description}</span>}
      </label>
      <Sw.Root
        id={sid}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full bg-border-strong transition-colors data-[state=checked]:bg-primary"
      >
        <Sw.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow-card transition-transform data-[state=checked]:translate-x-6" />
      </Sw.Root>
    </div>
  );
}
