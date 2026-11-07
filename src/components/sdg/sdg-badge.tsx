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
      <SdgIcon goal={goal} className="mt-[14%] size-[46%]" strokeWidth={1.9} />
    </span>
  );
}
