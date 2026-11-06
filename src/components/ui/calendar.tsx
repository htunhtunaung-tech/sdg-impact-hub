"use client";

import * as React from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Month calendar. Days with events get a dot; the selected day is filled.
 * Arrow-key friendly through native buttons; each day has a full accessible name.
 */
export function MiniCalendar({
  events = [],
  selected,
  onSelect,
  initialMonth,
  className,
}: {
  events?: Date[];
  selected?: Date | null;
  onSelect?: (d: Date) => void;
  initialMonth?: Date;
  className?: string;
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(initialMonth ?? selected ?? new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const has = (d: Date) => events.some((e) => isSameDay(e, d));
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-ink" aria-live="polite">{format(month, "MMMM yyyy")}</h3>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setMonth(subMonths(month, 1))} className="flex size-9 items-center justify-center rounded-full bg-[var(--color-track)] text-ink-muted hover:text-ink" aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} className="flex size-9 items-center justify-center rounded-full bg-[var(--color-track)] text-ink-muted hover:text-ink" aria-label="Next month">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={format(month, "MMMM yyyy")}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold uppercase text-ink-subtle" aria-hidden>{d}</span>
        ))}
        {days.map((d) => {
          const out = !isSameMonth(d, month);
          const sel = selected && isSameDay(selected, d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect?.(d)}
              aria-pressed={sel || undefined}
              aria-label={`${format(d, "EEEE d MMMM")}${has(d) ? ", has events" : ""}`}
              className={cn(
                "relative mx-auto flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                out ? "text-ink-subtle hover:bg-track" : "text-ink hover:bg-mint",
                isToday(d) && !sel && "font-bold text-forest-900 ring-1 ring-accent",
                sel && "bg-primary font-semibold text-white hover:bg-primary",
              )}
            >
              {format(d, "d")}
              {has(d) && <span className={cn("absolute bottom-1 size-1 rounded-full", sel ? "bg-white" : "bg-accent")} aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
