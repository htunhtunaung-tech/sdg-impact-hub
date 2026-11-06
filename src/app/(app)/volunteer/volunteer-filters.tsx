"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { List, Loader2, Map as MapIcon, Search } from "lucide-react";
import { Checkbox, Input, Radio, Select } from "@/components/ui/input";
import { SDGS } from "@/lib/sdg";
import { cn } from "@/lib/utils";

export function VolunteerFilters({ skills, hasLocation, signedIn }: { skills: string[]; hasLocation: boolean; signedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const update = (fn: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    fn(p);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  const toggle = (key: string, value: string) =>
    update((p) => {
      const cur = p.getAll(key);
      p.delete(key);
      (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).forEach((x) => p.append(key, x));
    });
  const set = (key: string, value: string) => update((p) => (value ? p.set(key, value) : p.delete(key)));

  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const when = sp.get("when") ?? "any";
  const where = sp.getAll("where");
  const skill = sp.getAll("skill");
  const time = sp.getAll("time");
  const view = sp.get("view") ?? "list";

  const group = "border-t border-border pt-4";
  const option = "flex min-h-9 cursor-pointer items-center gap-3 text-[15px]";

  return (
    <aside className="h-fit rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card lg:sticky lg:top-24" aria-label="Filters">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">Filters {pending && <Loader2 className="size-4 animate-spin text-ink-subtle" />}</h2>
        <button type="button" onClick={() => { setQ(""); start(() => router.replace(pathname, { scroll: false })); }} className="text-sm font-semibold text-link hover:underline">Reset</button>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9" aria-label="Search opportunities" />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-slate-100 p-1" role="group" aria-label="View">
          {(["list", "map"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => set("view", v === "list" ? "" : v)} className={cn("flex h-8 items-center justify-center gap-1.5 rounded-md text-sm font-medium", view === v ? "bg-surface shadow-card" : "text-ink-muted")}>
              {v === "list" ? <List className="size-4" /> : <MapIcon className="size-4" />} {v === "list" ? "List" : "Map"}
            </button>
          ))}
        </div>
        <Select aria-label="Sort" value={sp.get("sort") ?? "soonest"} onChange={(e) => set("sort", e.target.value === "soonest" ? "" : e.target.value)}>
          <option value="soonest">Sort: Soonest</option>
          <option value="spots">Sort: Most spots left</option>
          {hasLocation && <option value="nearest">Sort: Nearest</option>}
        </Select>
        <Select aria-label="Goal" value={sp.get("goal") ?? ""} onChange={(e) => set("goal", e.target.value)}>
          <option value="">Goal: Any</option>
          {SDGS.map((g) => <option key={g.id} value={g.id}>{g.id}. {g.shortTitle}</option>)}
        </Select>

        <fieldset className={group}>
          <legend className="mb-1 pt-4 font-semibold">When</legend>
          {[["any", "Any time"], ["week", "This week"], ["weekend", "This weekend"], ["30", "Next 30 days"]].map(([k, l]) => (
            <label key={k} className={option}><Radio name="when" checked={when === k} onChange={() => set("when", k === "any" ? "" : k)} /> {l}</label>
          ))}
        </fieldset>
        <fieldset className={group}>
          <legend className="mb-1 pt-4 font-semibold">Where</legend>
          <label className={cn(option, !hasLocation && "opacity-60")} title={hasLocation ? undefined : "Add your location in Settings"}>
            <Checkbox checked={where.includes("near")} disabled={!hasLocation} onChange={() => toggle("where", "near")} /> Near me (25 km)
          </label>
          {!hasLocation && signedIn && <p className="-mt-1 mb-1 pl-8 text-xs text-ink-subtle">Set your location in <a href="/settings" className="underline">Settings</a></p>}
          <label className={option}><Checkbox checked={where.includes("online")} onChange={() => toggle("where", "online")} /> Online</label>
          <label className={option}><Checkbox checked={where.includes("anywhere")} onChange={() => toggle("where", "anywhere")} /> Anywhere</label>
        </fieldset>
        {skills.length > 0 && (
          <fieldset className={group}>
            <legend className="mb-1 pt-4 font-semibold">Skills</legend>
            {skills.map((s) => (
              <label key={s} className={option}><Checkbox checked={skill.includes(s)} onChange={() => toggle("skill", s)} /> {s}</label>
            ))}
          </fieldset>
        )}
        <fieldset className={group}>
          <legend className="mb-1 pt-4 font-semibold">Time needed</legend>
          {[["short", "Under 2 hours"], ["mid", "2–4 hours"], ["long", "More than 4 hours"]].map(([k, l]) => (
            <label key={k} className={option}><Checkbox checked={time.includes(k!)} onChange={() => toggle("time", k!)} /> {l}</label>
          ))}
        </fieldset>
      </div>
    </aside>
  );
}
