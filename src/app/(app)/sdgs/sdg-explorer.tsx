"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { sdgForeground } from "@/lib/sdg";
import { cn } from "@/lib/utils";

type Goal = { id: number; title: string; color: string; category: string; tagline: string; projects: number; followers: number };

export function SdgExplorer({
  goals,
  followed,
  categories,
  signedIn,
}: {
  goals: Goal[];
  followed: number[];
  categories: { key: string; label: string }[];
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const visible = useMemo(
    () =>
      goals.filter(
        (g) =>
          (!cat || g.category === cat) &&
          (!onlyFollowed || followed.includes(g.id)) &&
          (!q.trim() || `${g.id} ${g.title} ${g.tagline}`.toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [goals, cat, q, onlyFollowed, followed],
  );

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary text-white" : "border-border-strong bg-surface text-ink hover:bg-canvas",
    );
  const count = (active: boolean) => cn("rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-forest-950/40 text-white" : "bg-mint-strong text-forest-900");

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-subtle" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search goals" className="pl-10" aria-label="Search goals" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filter by category">
          <button className={chip(!cat && !onlyFollowed)} aria-pressed={!cat && !onlyFollowed} onClick={() => { setCat(null); setOnlyFollowed(false); }}>
            {!cat && !onlyFollowed && <Check className="size-4" />} All goals <span className={count(!cat && !onlyFollowed)}>{goals.length}</span>
          </button>
          {categories.map((c) => {
            const n = goals.filter((g) => g.category === c.key).length;
            const active = cat === c.key;
            return (
              <button key={c.key} className={chip(active)} aria-pressed={active} onClick={() => { setCat(active ? null : c.key); setOnlyFollowed(false); }}>
                {active && <Check className="size-4" />} {c.label} <span className={count(active)}>{n}</span>
              </button>
            );
          })}
          {signedIn && (
            <button className={chip(onlyFollowed)} aria-pressed={onlyFollowed} onClick={() => { setOnlyFollowed(!onlyFollowed); setCat(null); }}>
              {onlyFollowed && <Check className="size-4" />} Following <span className={count(onlyFollowed)}>{followed.length}</span>
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState className="mt-6" title="No goals match" description="Try a different search or clear the filters." />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((g, i) => {
            const fg = sdgForeground(g.color);
            const isFollowed = followed.includes(g.id);
            return (
              <motion.li key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                <Link
                  href={`/sdgs/${g.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised"
                >
                  <div className="relative px-4 pb-3 pt-4" style={{ background: g.color, color: fg }}>
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Goal</span>
                    <span className="block text-[40px] font-extrabold leading-none tracking-tight">{g.id}</span>
                    {isFollowed && (
                      <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-white text-ink" title="You follow this goal">
                        <Check className="size-4" style={{ color: g.color }} aria-label="Following" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-[15px] font-semibold leading-snug text-ink group-hover:underline">{g.title}</span>
                    <span className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] text-ink-muted">
                      <FolderOpen className="size-3.5" aria-hidden /> {g.projects} {g.projects === 1 ? "project" : "projects"}
                    </span>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
