import Link from "next/link";
import { SdgIcon } from "@/components/sdg/sdg-icon";
import { sdg, sdgForeground } from "@/lib/sdg";
import { cn } from "@/lib/utils";

/** Small square goal number in the official colour (e.g. "6"). */
export function SdgNumber({ goal, size = 24, className }: { goal: number; size?: number; className?: string }) {
  const g = sdg(goal);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[5px] font-bold tabular-nums", className)}
      style={{ background: g.color, color: sdgForeground(g.color), width: size, height: size, fontSize: size <= 20 ? 10 : size <= 28 ? 12 : 14 }}
      aria-hidden
    >
      {goal}
    </span>
  );
}

/** "[6] Goal 6 · Clean Water" label. */
export function SdgLabel({ goal, short = true, link = false, className }: { goal: number; short?: boolean; link?: boolean; className?: string }) {
  const g = sdg(goal);
  const content = (
    <>
      <SdgNumber goal={goal} size={20} />
      <span>
        Goal {goal}
        {short !== null && <> · {short ? g.shortTitle : g.title}</>}
      </span>
    </>
  );
  const cls = cn("inline-flex items-center gap-2 text-xs font-medium text-ink-muted", className);
  return link ? (
    <Link href={`/sdgs/${goal}`} className={cn(cls, "hover:text-ink")}>
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  );
}

/** Mini goal tile — colour square with the goal's pictogram and its number in the corner (like the official SDG icons). */
export function SdgTile({ goal, className }: { goal: number; className?: string }) {
  const g = sdg(goal);
  return (
    <span
      className={cn("relative flex aspect-square items-center justify-center overflow-hidden rounded-[12px] @container", className)}
      style={{ background: g.color, color: sdgForeground(g.color) }}
      aria-hidden
    >
      <span className="absolute left-[11%] top-[8%] text-[clamp(8px,26cqw,15px)] font-extrabold leading-none tabular-nums">{goal}</span>
      <SdgIcon goal={goal} className="mt-[14%] size-[46%] transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-115" strokeWidth={1.9} />
    </span>
  );
}

/**
 * Goal tag following the SDG colour rules: always shows the number; the primary goal is filled with the
 * official hex and the higher-contrast text colour; secondary goals are outlined (goal-colour border, ink text,
 * white fill), so a goal colour is never used as text on a light background. Full UN title on hover.
 */
export function GoalTag({ goal, variant = "filled", className }: { goal: number; variant?: "filled" | "outline"; className?: string }) {
  const g = sdg(goal);
  const filled = variant === "filled";
  return (
    <span
      title={`Goal ${goal}: ${g.title}`}
      className={cn("inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold", filled ? "" : "border bg-white text-ink forced-colors:border-[CanvasText]", className)}
      style={filled ? { background: g.color, color: sdgForeground(g.color) } : { borderColor: g.color }}
    >
      <span className="tabular-nums">{goal}</span>
      <span className="truncate">{g.shortTitle}</span>
    </span>
  );
}

/** Up to `max` goal tags: primary filled first, others outlined in goal-number order, then "+N". */
export function GoalTags({ primary, others = [], max = 3, className }: { primary: number; others?: number[]; max?: number; className?: string }) {
  const rest = [...new Set(others)].filter((g) => g !== primary).sort((a, b) => a - b);
  const shown = rest.slice(0, max - 1);
  const hidden = rest.length - shown.length;
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
      <GoalTag goal={primary} />
      {shown.map((g) => <GoalTag key={g} goal={g} variant="outline" />)}
      {hidden > 0 && (
        <span className="inline-flex h-7 items-center rounded-full border border-border-strong px-2 text-xs font-semibold text-ink-muted" title={rest.slice(max - 1).map((g) => `Goal ${g}: ${sdg(g).title}`).join("\n")}>
          +{hidden}
        </span>
      )}
    </span>
  );
}
