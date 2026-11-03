"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/forms/file-upload";
import { SDGS } from "@/lib/sdg";
import { submitImpactAction } from "@/server/actions/impact";

type Init = { opportunityId: string; projectId: string; goalId: number; title: string; date: string; hours: string };

export function ImpactForm({ projects, opportunities, metrics, initial }: {
  projects: { id: string; title: string; goalId: number }[];
  opportunities: { id: string; title: string; projectId: string | null; goalId: number; date: string; hours: number }[];
  metrics: { id: string; name: string; unit: string; goalId: number }[];
  initial: Init;
}) {
  const router = useRouter();
  const [v, setV] = useState({ ...initial, description: "", evidenceUrl: null as string | null, values: [] as { metricId: string; value: string }[] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const today = new Date().toISOString().slice(0, 10);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    start(async () => {
      const res = await submitImpactAction({
        title: v.title, description: v.description || undefined, date: v.date, hours: Number(v.hours || 0), goalId: v.goalId,
        projectId: v.projectId || null, opportunityId: v.opportunityId || null, evidenceUrl: v.evidenceUrl ?? undefined,
        values: v.values.filter((x) => x.metricId && x.value).map((x) => ({ metricId: x.metricId, value: Number(x.value) })),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      toast.success(res.message);
      router.push("/impact");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <FormError message={formError} />
          {opportunities.length > 0 && (
            <Field label="Was this a volunteer session?" htmlFor="opportunityId" hint="Choosing a session fills in the details for you.">
              <Select value={v.opportunityId} onChange={(e) => {
                const o = opportunities.find((x) => x.id === e.target.value);
                setV((s) => o ? { ...s, opportunityId: o.id, projectId: o.projectId ?? "", goalId: o.goalId, title: o.title, date: o.date, hours: String(o.hours) } : { ...s, opportunityId: "" });
              }}>
                <option value="">No — something else</option>
                {opportunities.map((o) => <option key={o.id} value={o.id}>{o.title} · {o.date}</option>)}
              </Select>
            </Field>
          )}
          <Field label="What did you do?" htmlFor="title" error={errors.title} required>
            <Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Beach clean-up" maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project" htmlFor="projectId" error={errors.projectId}>
              <Select value={v.projectId} onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value);
                setV((s) => ({ ...s, projectId: e.target.value, goalId: p?.goalId ?? s.goalId }));
              }}>
                <option value="">Not part of a project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </Field>
            <Field label="Goal" htmlFor="goalId" error={errors.goalId}>
              <Select value={v.goalId} onChange={(e) => set("goalId", Number(e.target.value))}>
                {SDGS.map((g) => <option key={g.id} value={g.id}>{g.id}. {g.shortTitle}</option>)}
              </Select>
            </Field>
            <Field label="Date" htmlFor="date" error={errors.date} required><Input type="date" max={today} value={v.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Hours" htmlFor="hours" error={errors.hours}><Input type="number" min={0} max={24} step={0.5} value={v.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
          </div>
          <Field label="Notes" htmlFor="description" hint="Optional — what happened, who was involved."><Textarea value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={1500} /></Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">Measured outcomes <span className="font-normal text-ink-subtle">(optional)</span></p>
            <p className="text-xs text-ink-subtle">Only enter numbers you measured or counted — not estimates.</p>
            {v.values.map((x, i) => (
              <div key={i} className="flex gap-2">
                <Select aria-label="Outcome" value={x.metricId} onChange={(e) => set("values", v.values.map((y, j) => (j === i ? { ...y, metricId: e.target.value } : y)))}>
                  <option value="">Choose…</option>
                  {metrics.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                </Select>
                <Input aria-label="Value" type="number" min={0} className="w-32" value={x.value} onChange={(e) => set("values", v.values.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remove outcome" onClick={() => set("values", v.values.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
            {v.values.length < 8 && <Button type="button" variant="secondary" size="sm" onClick={() => set("values", [...v.values, { metricId: "", value: "" }])}><Plus /> Add outcome</Button>}
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Evidence <span className="font-normal text-ink-subtle">(recommended)</span></p>
            <FileUpload id="evidence" kind="evidence" label="Upload a photo or attendance sheet" value={v.evidenceUrl} onChange={(u) => set("evidenceUrl", u)} />
            <p className="mt-1.5 text-xs text-ink-subtle">Only you and the reviewers can see evidence files.</p>
          </div>

          <p className="flex gap-2 rounded-[10px] bg-info-soft p-3 text-sm text-info">
            <Info className="mt-0.5 size-4 shrink-0" />
            Your entry is marked <strong>self-reported</strong> until a project organizer or administrator verifies it. XP, badges and leaderboards only count verified impact.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" size="lg" loading={pending}>Submit for verification</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
