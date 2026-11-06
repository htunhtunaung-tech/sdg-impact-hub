"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";
import { formatNumber } from "@/lib/utils";

export type DonutSlice = { key: string; label: string; value: number; color: string };

function Tip({ active, payload, unit }: TooltipProps<number, string> & { unit: string; payload?: { payload: DonutSlice }[] }) {
  if (!active || !payload?.length) return null;
  const s = payload[0]!.payload;
  return (
    <div className="rounded-[16px] bg-ink px-3 py-2 text-white shadow-overlay">
      <p className="text-xs text-slate-300">{s.label}</p>
      <p className="text-sm font-bold">{formatNumber(s.value)} {unit}</p>
    </div>
  );
}

/**
 * Donut with the total in the centre and a legend that doubles as the accessible data table
 * (percentages are written out, so the chart never relies on colour alone).
 */
export function DonutChart({
  data,
  unit = "h",
  centerLabel,
  size = 200,
  legend = "side",
}: {
  data: DonutSlice[];
  unit?: string;
  centerLabel: string;
  size?: number;
  legend?: "side" | "below";
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const rows = data.filter((d) => d.value > 0);
  return (
    <div className={legend === "side" ? "flex flex-col items-center gap-6 sm:flex-row sm:items-center" : "flex flex-col items-center gap-5"}>
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Donut chart, ${formatNumber(total)} ${unit} in total`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius="66%" outerRadius="100%" paddingAngle={rows.length > 1 ? 2.5 : 0} cornerRadius={6} stroke="none" isAnimationActive={false}>
              {rows.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<Tip unit={unit} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[28px] font-bold leading-none tracking-tight text-ink">{formatNumber(total)}{unit === "h" ? "h" : ""}</span>
          <span className="mt-1 text-xs font-medium text-ink-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2.5" aria-label="Breakdown">
        {rows.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5 text-sm">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: d.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink">{d.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">
              {total ? Math.round((d.value / total) * 100) : 0}% · <span className="font-semibold text-ink">{formatNumber(d.value)} {unit}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
