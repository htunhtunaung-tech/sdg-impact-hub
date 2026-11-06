import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Numbered progress steps (1 → 2 → 3 → ✓). Completed steps show a check, the current step a
 * filled ring. Exposed to assistive tech as an ordered list with the current step announced.
 */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex w-full items-center", className)} aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")} aria-current={now ? "step" : undefined}>
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  done && "bg-primary text-white",
                  now && "bg-surface text-forest-900 ring-[3px] ring-accent",
                  !done && !now && "bg-surface text-ink-subtle ring-1 ring-border-strong",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                <span className="sr-only">{done ? " (done)" : now ? " (current)" : ""}</span>
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", now ? "text-ink" : "text-ink-subtle")}>{label}</span>
            </span>
            {i < steps.length - 1 && (
              <span className={cn("mx-2 h-[3px] flex-1 rounded-full sm:mb-5", done ? "bg-primary" : "bg-border")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
