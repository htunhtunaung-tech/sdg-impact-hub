import { SdgNumber } from "@/components/sdg/sdg-badge";
import { sdg } from "@/lib/sdg";
import { formatNumber } from "@/lib/utils";

/** Horizontal bars of hours per goal, in each goal's official colour. */
export function GoalBars({ rows, showShare = false }: { rows: { goal: number; hours: number }[]; showShare?: boolean }) {
  const max = Math.max(...rows.map((r) => r.hours), 1);
  const total = rows.reduce((s, r) => s + r.hours, 0) || 1;
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const g = sdg(r.goal);
        return (
          <li key={r.goal} className={showShare ? "space-y-2" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,240px)_1fr_48px]"}>
            <div className="flex min-w-0 items-center gap-3">
              <SdgNumber goal={r.goal} size={28} />
              <span className="truncate text-[15px] text-ink">{showShare ? g.shortTitle : g.title}</span>
              {showShare && (
                <span className="ml-auto shrink-0 text-sm text-ink-muted">
                  {Math.round((r.hours / total) * 100)}% · {formatNumber(r.hours)} h
                </span>
              )}
            </div>
            {!showShare && <span className="text-right text-[15px] font-semibold tabular-nums sm:order-last">{formatNumber(r.hours)} h</span>}
            <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-200 sm:col-span-1" role="presentation">
              <div className="h-full rounded-full" style={{ width: `${(r.hours / (showShare ? total : max)) * 100}%`, background: g.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
