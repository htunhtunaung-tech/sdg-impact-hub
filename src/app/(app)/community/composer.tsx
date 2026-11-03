"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SDGS } from "@/lib/sdg";
import { createPostAction } from "@/server/actions/community";

export function Composer({ groups, defaultGoal, groupId }: { groups: { id: string; name: string }[]; defaultGoal?: number | null; groupId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [goal, setGoal] = useState<string>(defaultGoal ? String(defaultGoal) : "");
  const [group, setGroup] = useState(groupId ?? "");
  const [isEvent, setIsEvent] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createPostAction({
        type: isEvent ? "EVENT" : "POST", body, title: isEvent ? title : undefined, goalId: goal ? Number(goal) : null, groupId: group || null,
        eventStartsAt: isEvent && when ? new Date(when).toISOString() : null, eventLocation: isEvent ? where : undefined,
      });
      if (!res.ok) return setError(Object.values(res.fieldErrors ?? {})[0] ?? res.error);
      toast.success(res.message);
      setBody(""); setTitle(""); setWhen(""); setWhere(""); setIsEvent(false);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card">
      <label htmlFor="composer" className="sr-only">Share an update</label>
      {isEvent && <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="mb-2" aria-label="Event title" />}
      <Textarea id="composer" value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={3000} placeholder={isEvent ? "What's happening and who should come?" : "Share progress, a question or an idea…"} className="border-0 px-0 focus:ring-0" />
      {isEvent && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Event start" />
          <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Location or link" aria-label="Event location" />
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Select value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Tag a goal" className="h-9 w-auto text-[13px]">
          <option value="">Tag a goal</option>
          {SDGS.map((g) => <option key={g.id} value={g.id}>Goal {g.id} · {g.shortTitle}</option>)}
        </Select>
        {!groupId && groups.length > 0 && (
          <Select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Post in group" className="h-9 w-auto text-[13px]">
            <option value="">Public feed</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
        )}
        <Button type="button" variant={isEvent ? "soft" : "ghost"} size="sm" onClick={() => setIsEvent(!isEvent)} aria-pressed={isEvent}><CalendarPlus /> Event</Button>
        <Button type="submit" size="sm" className="ml-auto" loading={pending} disabled={!body.trim()}>Post</Button>
      </div>
    </form>
  );
}
