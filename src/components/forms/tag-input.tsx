"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Free-text list input (skills, objectives…). Enter or comma adds an item. */
export function TagInput({ id, value, onChange, placeholder, suggestions = [], max = 20 }: {
  id?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[]; max?: number;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, "");
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-mint py-1 pl-3 pr-1 text-sm font-medium text-forest-900">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-mint-strong" aria-label={`Remove ${v}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
      />
      {suggestions.filter((s) => !value.includes(s)).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !value.includes(s)).slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-ink-muted hover:border-border-strong hover:text-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ordered list of sentences (objectives, tasks). */
export function ListInput({ id, value, onChange, placeholder, max = 10 }: { id?: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div>
      {value.length > 0 && (
        <ol className="mb-2 space-y-1.5">
          {value.map((v, i) => (
            <li key={`${v}-${i}`} className="flex items-start gap-2 rounded-[10px] border border-border bg-canvas px-3 py-2 text-sm">
              <span className="font-semibold text-ink-subtle">{i + 1}.</span>
              <span className="flex-1">{v}</span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`} className="rounded p-0.5 hover:bg-slate-200">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <Input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="shrink-0 rounded-[10px] border border-border-strong px-3 text-sm font-semibold hover:bg-canvas">Add</button>
      </div>
    </div>
  );
}
