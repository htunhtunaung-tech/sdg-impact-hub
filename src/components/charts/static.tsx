import { formatNumber } from "@/lib/utils";

/**
 * Zero-JavaScript charts for summary views (dashboard). Rendered on the server as SVG, so they
 * add nothing to the client bundle or main-thread time. Each has a visually hidden data table
 * and native hover titles; the interactive Recharts versions live on Impact Analytics.
 */

type Point = { key: string; label: string; full: string; verified: number };

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function StaticAreaChart({ data, height = 220, unit = "verified hours" }: { data: Point[]; height?: number; unit?: string }) {
  const W = 600;
  const H = 200;
  const max = Math.max(4, ...data.map((d) => d.verified));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * W : W / 2);
  const y = (v: number) => H - (v / top) * H;
  const pts = data.map((d, i) => [Math.round(x(i)), Math.round(y(d.verified))] as [number, number]);
  const line = smoothPath(pts);
  const area = line ? `${line} L${W},${H} L0,${H} Z` : "";
  const peak = data.reduce((m, d, i) => (d.verified > (data[m]?.verified ?? 0) ? i : m), 0);
  const last = data.length - 1;

  return (
    <figure className="m-0">
      <div className="flex gap-3" style={{ height }}>
        <div className="flex w-6 flex-col justify-between pb-6 text-right text-xs tabular-nums text-ink-subtle" aria-hidden>
          {[4, 3, 2, 1, 0].map((k) => <span key={k}>{k * step}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-x-0 top-[7px] h-[calc(100%-31px)] w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="static-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((k) => (
              <line key={k} x1="0" x2={W} y1={(H / 4) * k} y2={(H / 4) * k} stroke="var(--color-border)" strokeDasharray={k === 4 ? undefined : "4 4"} vectorEffect="non-scaling-stroke" />
            ))}
            {area && <path d={area} fill="url(#static-area)" className="chart-area" />}
            {line && <path d={line} pathLength={1} className="chart-line" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
            {data.map((d, i) => (
              <rect key={d.key} x={x(i) - W / data.length / 2} y="0" width={W / data.length} height={H} fill="transparent">
                <title>{`${d.full}: ${formatNumber(d.verified)} ${unit}`}</title>
              </rect>
            ))}
          </svg>
          {/* Dots and the peak callout as HTML so they stay round at any width */}
          {[peak, last].filter((v, i, a) => a.indexOf(v) === i).map((i) => {
            const d = data[i];
            if (!d) return null;
            return (
              <span key={d.key} className="chart-dot pointer-events-none absolute" style={{ left: `${(x(i) / W) * 100}%`, top: `calc(7px + (100% - 31px) * ${y(d.verified) / H})` }} aria-hidden>
                <span className="absolute -left-[6px] -top-[6px] size-3 rounded-full border-2 border-white bg-accent shadow-card" />
                {i === peak && d.verified > 0 && (
                  <span className={`absolute -top-11 whitespace-nowrap rounded-[12px] bg-ink px-2.5 py-1 text-xs font-semibold text-white shadow-raised ${i === last ? "right-0" : i === 0 ? "left-0" : "-translate-x-1/2"}`}>
                    {d.label}: {formatNumber(d.verified)}h
                  </span>
                )}
              </span>
            );
          })}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-xs text-ink-muted" aria-hidden>
            {data.map((d) => <span key={d.key}>{d.label}</span>)}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Verified hours per month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Verified hours</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.key}><td>{d.full}</td><td>{formatNumber(d.verified)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export type StaticSlice = { key: string; label: string; value: number; color: string };

export function StaticDonut({ data, size = 180, centerLabel = "verified" }: { data: StaticSlice[]; size?: number; centerLabel?: string }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0) || 1;
  const gap = rows.length > 1 ? 1.2 : 0; // percent of circumference between slices
  let offset = 0;
  return (
    <figure className="m-0 flex flex-col items-center gap-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 42 42" className="size-full -rotate-90" aria-hidden>
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--color-track)" strokeWidth="6" />
          {rows.map((d) => {
            const len = Math.max(0, (d.value / total) * 100 - gap);
            const el = (
              <circle key={d.key} cx="21" cy="21" r="15.9155" fill="none" stroke={d.color} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-offset} strokeLinecap="butt" className="donut-slice">
                <title>{`${d.label}: ${formatNumber(d.value)} h`}</title>
              </circle>
            );
            offset += (d.value / total) * 100;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
          <span className="text-[28px] font-bold leading-none tracking-tight text-ink">{formatNumber(total)}h</span>
          <span className="mt-1 text-xs font-medium text-ink-muted">{centerLabel}</span>
        </div>
      </div>
      <figcaption className="sr-only">{`${formatNumber(total)} verified hours by goal`}</figcaption>
      <ul className="w-full space-y-2.5">
        {rows.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink">{d.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">
              {Math.round((d.value / total) * 100)}% · <span className="font-semibold text-ink">{formatNumber(d.value)} h</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
