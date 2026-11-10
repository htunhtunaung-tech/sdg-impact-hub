"use client";

import { Check } from "lucide-react";
import { SdgTile } from "@/components/sdg/sdg-badge";
import { SdgIcon } from "@/components/sdg/sdg-icon";
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
    <div className={cn("grid gap-2", compact ? "grid-cols-[repeat(auto-fill,minmax(96px,1fr))]" : "grid-cols-2 sm:grid-cols-3")}>
      {SDGS.map((g) => {
        const on = value.includes(g.id);
        const fg = sdgForeground(g.color);
        return compact ? (
          <button
            key={g.id}
            type="button"
            aria-pressed={on}
            title={g.title}
            onClick={() => toggle(g.id)}
            className={cn(
              "group relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[12px] px-1.5 pb-2 pt-3 text-center transition-[box-shadow,transform,background-color] duration-150 active:scale-95",
              on ? "shadow-card ring-2 ring-ink ring-offset-2" : "bg-surface ring-1 ring-border-strong hover:-translate-y-0.5 hover:shadow-card hover:ring-ink",
            )}
            style={on ? { background: g.color, color: fg } : undefined}
          >
            <span
              className={cn("absolute left-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] px-1 text-[10px] font-extrabold leading-none tabular-nums", on ? "bg-black/15" : "")}
              style={on ? undefined : { background: g.color, color: fg }}
              aria-hidden
            >
              {g.id}
            </span>
            {on && <Check className="absolute right-1.5 top-1.5 size-3.5" strokeWidth={3} aria-hidden />}
            <SdgIcon
              goal={g.id}
              className="size-6 shrink-0 transition-transform duration-300 group-hover:scale-110"
              strokeWidth={2}
              style={on ? undefined : { color: g.id === 7 ? "#8A6A00" : g.color }}
              aria-hidden
            />
            <span className={cn("line-clamp-2 text-[11px] font-semibold leading-tight", on ? "" : "text-ink")}>
              <span className="sr-only">Goal {g.id}: </span>
              {g.shortTitle}
            </span>
          </button>
        ) : (
          <button
            key={g.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(g.id)}
            className={cn(
              "flex min-h-12 items-center gap-2.5 rounded-[14px] border p-2 text-left text-sm transition-colors",
              on ? "border-forest-900 bg-mint font-semibold text-forest-900" : "border-border bg-surface text-ink-muted hover:border-border-strong",
            )}
          >
            <SdgTile goal={g.id} className="size-9 shrink-0 rounded-[8px]" />
            <span className="line-clamp-2 min-w-0 flex-1 leading-tight">{g.shortTitle}</span>
            {on && <Check className="size-4 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
