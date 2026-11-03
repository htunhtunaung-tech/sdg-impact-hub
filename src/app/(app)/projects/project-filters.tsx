"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { SDGS, sdg } from "@/lib/sdg";

type Defaults = { q: string; goals: number[]; city: string; status: string; sort: string };

export function ProjectFilters({ cities, defaults, signedIn }: { cities: string[]; defaults: Defaults; signedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(defaults.q);

  const push = (next: Partial<Defaults>) => {
    const v = { ...defaults, q, ...next };
    const p = new URLSearchParams(window.location.search);
    p.delete("page");
    p.delete("goal");
    v.goals.forEach((g) => p.append("goal", String(g)));
    for (const k of ["q", "city", "status", "sort"] as const) {
      if (v[k]) p.set(k, v[k]);
      else p.delete(k);
    }
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if (q === defaults.q) return;
    const t = setTimeout(() => push({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const chips = [
    ...defaults.goals.map((g) => ({ key: `g${g}`, label: sdg(g).shortTitle, remove: () => push({ goals: defaults.goals.filter((x) => x !== g) }) })),
    ...(defaults.city ? [{ key: "city", label: defaults.city === "online" ? "Online" : defaults.city, remove: () => push({ city: "" }) }] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          {pending ? (
            <Loader2 className="absolute left-3 top-1/2 size-[18px] -translate-y-1/2 animate-spin text-ink-subtle" aria-hidden />
          ) : (
            <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-subtle" aria-hidden />
          )}
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="pl-10" aria-label="Search projects" />
        </div>
        <Select
          aria-label="Goal"
          value=""
          onChange={(e) => {
            const g = Number(e.target.value);
            if (g && !defaults.goals.includes(g)) push({ goals: [...defaults.goals, g] });
          }}
        >
          <option value="">{defaults.goals.length ? `Goal: ${defaults.goals.length} selected` : "Goal: Any"}</option>
          {SDGS.map((g) => (
            <option key={g.id} value={g.id} disabled={defaults.goals.includes(g.id)}>
              {g.id}. {g.title}
            </option>
          ))}
        </Select>
        <Select aria-label="Location" value={defaults.city} onChange={(e) => push({ city: e.target.value })}>
          <option value="">Location: Any</option>
          <option value="online">Online</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" value={defaults.status} onChange={(e) => push({ status: e.target.value })}>
          <option value="OPEN">Status: Open</option>
          <option value="any">Status: Any</option>
          <option value="PLANNING">Planning</option>
          <option value="RECRUITING">Recruiting</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </Select>
        <Select aria-label="Sort" value={defaults.sort} onChange={(e) => push({ sort: e.target.value })}>
          {signedIn && <option value="relevant">Sort: Most relevant</option>}
          <option value="newest">Sort: Newest</option>
          <option value="starting">Sort: Starting soonest</option>
          <option value="spots">Sort: Most volunteers needed</option>
        </Select>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex h-8 items-center gap-2 rounded-full border border-border-strong bg-surface pl-3.5 pr-1.5 text-sm font-medium">
              {c.label}
              <button type="button" onClick={c.remove} className="rounded-full p-1 hover:bg-slate-100" aria-label={`Remove filter ${c.label}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={() => { setQ(""); push({ goals: [], city: "", q: "" }); }} className="ml-1 text-sm font-semibold text-link hover:underline">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
