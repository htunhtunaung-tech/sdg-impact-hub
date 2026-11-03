"use client";

import { Check } from "lucide-react";
import { SDGS, sdgForeground } from "@/lib/sdg";
import { cn } from "@/lib/utils";

/** Multi-select grid of the 17 goals. Keyboard accessible (each tile is a toggle button). */
export function GoalPicker({
  value,
  onChange,
  max = 17,
  compact = false,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  max?: number;
  compact?: boolean;
}) {
  const toggle = (id: number) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < max) onChange([...value, id]);
  };
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-6 sm:grid-cols-9" : "grid-cols-2 sm:grid-cols-3")}>
      {SDGS.map((g) => {
        const on = value.includes(g.id);
        const fg = sdgForeground(g.color);
        return compact ? (
          <button
            key={g.id}
            type="button"
            aria-pressed={on}
            aria-label={`Goal ${g.id}: ${g.title}`}
            title={g.title}
            onClick={() => toggle(g.id)}
            className={cn(
              "relative flex aspect-square items-center justify-center rounded-[8px] text-sm font-bold transition-all",
              on ? "ring-2 ring-ink ring-offset-2" : "opacity-45 hover:opacity-80",
            )}
            style={{ background: g.color, color: fg }}
          >
            {g.id}
            {on && <Check className="absolute right-0.5 top-0.5 size-3" aria-hidden />}
          </button>
        ) : (
          <button
            key={g.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(g.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-[10px] border p-2 text-left text-sm transition-colors",
              on ? "border-forest-900 bg-mint font-semibold text-forest-900" : "border-border bg-surface text-ink-muted hover:border-border-strong",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ background: g.color, color: fg }}>
              {g.id}
            </span>
            <span className="min-w-0 flex-1 truncate">{g.shortTitle}</span>
            {on && <Check className="size-4 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
