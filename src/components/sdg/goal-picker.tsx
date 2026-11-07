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
              "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-[10px] transition-all",
              on ? "ring-2 ring-ink ring-offset-2" : "bg-surface ring-1 ring-border-strong hover:ring-ink",
            )}
            style={on ? { background: g.color, color: fg } : { color: g.id === 7 ? "#8A6A00" : g.color }}
          >
            <SdgIcon goal={g.id} className="size-[42%]" strokeWidth={2} />
            <span className={cn("text-[11px] font-extrabold leading-none tabular-nums", !on && "text-ink")}>{g.id}</span>
            {on && <Check className="absolute right-0.5 top-0.5 size-3" aria-hidden />}
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
