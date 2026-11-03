import Link from "next/link";
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
