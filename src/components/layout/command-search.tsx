"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { Building2, FolderOpen, Heart, Loader2, Search, User } from "lucide-react";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { cn } from "@/lib/utils";

type Result = { type: "goal" | "project" | "opportunity" | "organization" | "person"; id: string; title: string; subtitle?: string; href: string; goal?: number };

const GROUP_LABEL: Record<Result["type"], string> = {
  goal: "Goals",
  project: "Projects",
  opportunity: "Volunteer opportunities",
  organization: "Organizations",
  person: "People",
};

export function CommandSearch({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setError(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const grouped = useMemo(() => {
    const m = new Map<Result["type"], Result[]>();
    for (const r of results) m.set(r.type, [...(m.get(r.type) ?? []), r]);
    return [...m.entries()];
  }, [results]);

  const go = (r: Result) => {
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    void listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        {iconOnly ? (
          <button className="inline-flex size-10 items-center justify-center rounded-[10px] border border-border text-ink-muted hover:bg-canvas" aria-label="Search">
            <Search className="size-[18px]" />
          </button>
        ) : (
          <button className="flex h-10 w-full items-center gap-3 rounded-[10px] border border-border bg-canvas px-3 text-left text-[15px] text-ink-subtle transition-colors hover:border-border-strong">
            <Search className="size-[18px]" aria-hidden />
            <span className="flex-1">Search projects, goals and people</span>
            <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">Ctrl K</kbd>
          </button>
        )}
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]" />
        <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-overlay data-[state=open]:animate-fade-in">
          <D.Title className="sr-only">Search</D.Title>
          <D.Description className="sr-only">Search projects, goals, opportunities, organizations and people</D.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            {loading ? <Loader2 className="size-5 animate-spin text-ink-subtle" /> : <Search className="size-5 text-ink-subtle" aria-hidden />}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search projects, goals and people…"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-subtle"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            />
            <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-ink-muted">Esc</kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {error && <p className="px-3 py-6 text-center text-sm text-danger">Search failed. Please try again.</p>}
            {!error && q.trim().length < 2 && <p className="px-3 py-6 text-center text-sm text-ink-subtle">Type at least two characters to search.</p>}
            {!error && q.trim().length >= 2 && !loading && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-ink-subtle">No results for “{q.trim()}”.</p>
            )}
            <ul ref={listRef} id="search-results" role="listbox">
              {grouped.map(([type, items]) => (
                <li key={type} role="presentation">
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">{GROUP_LABEL[type]}</p>
                  <ul role="presentation">
                    {items.map((r) => {
                      const idx = results.indexOf(r);
                      return (
                        <li
                          key={`${r.type}-${r.id}`}
                          id={`sr-${idx}`}
                          data-index={idx}
                          role="option"
                          aria-selected={idx === active}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => go(r)}
                          className={cn("flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5", idx === active && "bg-slate-100")}
                        >
                          <ResultIcon r={r} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink">{r.title}</span>
                            {r.subtitle && <span className="block truncate text-xs text-ink-muted">{r.subtitle}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function ResultIcon({ r }: { r: Result }) {
  if (r.type === "goal" && r.goal) return <SdgNumber goal={r.goal} size={28} />;
  const Icon = r.type === "project" ? FolderOpen : r.type === "opportunity" ? Heart : r.type === "organization" ? Building2 : User;
  return (
    <span className="flex size-7 items-center justify-center rounded-md bg-mint text-link">
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
