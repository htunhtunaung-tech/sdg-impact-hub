"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { Table2, ChartColumn } from "lucide-react";

export type MonthPoint = { key: string; label: string; full: string; verified: number; pending: number };

const VERIFIED = "#059669";
const PENDING = "#D97706";
const GRID = "var(--color-border)";
const AXIS = "var(--color-ink-subtle)";

function TipBox({ active, payload, showPending }: TooltipProps<number, string> & { showPending: boolean; payload?: { payload: MonthPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  return (
    <div className="rounded-[14px] bg-ink px-3.5 py-2.5 text-center text-white shadow-overlay">
      <p className="text-xs text-slate-300">{p.full}</p>
      <p className="text-sm font-bold">{p.verified} verified hours</p>
      {showPending && p.pending > 0 && <p className="text-xs text-amber-200">+ {p.pending} awaiting verification</p>}
    </div>
  );
}

function TableView({ data, showPending }: { data: MonthPoint[]; showPending: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Hours per month</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-2 font-semibold">Month</th>
            <th className="py-2 text-right font-semibold">Verified hours</th>
            {showPending && <th className="py-2 text-right font-semibold">Self-reported</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-b border-border last:border-0">
              <td className="py-2">{d.full}</td>
              <td className="py-2 text-right tabular-nums font-medium">{d.verified}</td>
              {showPending && <td className="py-2 text-right tabular-nums text-ink-muted">{d.pending}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ViewToggle({ table, setTable }: { table: boolean; setTable: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => setTable(!table)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
      {table ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />} {table ? "View as chart" : "View as table"}
    </button>
  );
}

/** Stacked columns: verified (solid) + self-reported (amber), with legend and table view. */
export function HoursBarChart({ data, height = 240 }: { data: MonthPoint[]; height?: number }) {
  const [table, setTable] = useState(false);
  const hasPending = data.some((d) => d.pending > 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex gap-4 text-xs text-ink-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: VERIFIED }} /> Verified</li>
          {hasPending && <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: PENDING }} /> Self-reported (pending)</li>}
        </ul>
        <ViewToggle table={table} setTable={setTable} />
      </div>
      {table ? (
        <TableView data={data} showPending={hasPending} />
      ) : (
        <div style={{ height }} role="img" aria-label="Column chart of hours per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS, fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }} content={<TipBox showPending={hasPending} />} />
              <Bar isAnimationActive={false} dataKey="verified" stackId="h" fill={VERIFIED} maxBarSize={24} stroke="#fff" strokeWidth={hasPending ? 1 : 0} radius={hasPending ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              {hasPending && <Bar isAnimationActive={false} dataKey="pending" stackId="h" fill={PENDING} maxBarSize={24} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Single-series verified hours trend (line + soft area wash), crosshair tooltip. */
export function HoursAreaChart({ data, height = 280 }: { data: MonthPoint[]; height?: number }) {
  const [table, setTable] = useState(false);
  const hasPending = data.some((d) => d.pending > 0);
  const peak = data.reduce((m, d) => (d.verified > m.verified ? d : m), data[0] ?? { verified: 0, key: "" } as MonthPoint);
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ViewToggle table={table} setTable={setTable} />
      </div>
      {table ? (
        <TableView data={data} showPending={hasPending} />
      ) : (
        <div style={{ height }} role="img" aria-label={`Line chart of verified hours per month. Peak: ${peak.full ?? ""}, ${peak.verified} hours.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VERIFIED} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={VERIFIED} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS, fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 12 }} />
              <Tooltip cursor={{ stroke: AXIS, strokeDasharray: "3 3" }} content={<TipBox showPending={hasPending} />} />
              <Area
                type="monotone"
                dataKey="verified"
                stroke={VERIFIED}
                strokeWidth={2.5}
                fill="url(#hoursFill)"
                isAnimationActive={false}
                dot={{ r: 4, fill: "#fff", stroke: VERIFIED, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: VERIFIED, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
