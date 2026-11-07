"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { GoalPicker } from "@/components/sdg/goal-picker";
import { FileUpload } from "@/components/forms/file-upload";
import { ListInput, TagInput } from "@/components/forms/tag-input";
import { LocationPicker } from "@/components/map/location-picker";
import { createProjectAction, updateProjectAction } from "@/server/actions/projects";
import { sdg } from "@/lib/sdg";
import type { ProjectFormValues } from "./project-defaults";

const SKILL_SUGGESTIONS = ["Teaching", "Coding", "Design", "Event support", "Translation", "Health care", "Engineering", "Data analysis", "Photography", "Community organising", "Fundraising", "Mentoring"];

export function ProjectForm({
  initial,
  projectId,
  organizations,
  metrics,
}: {
  initial: ProjectFormValues;
  projectId?: string;
  organizations: { id: string; name: string; verified: boolean }[];
  metrics: { id: string; name: string; unit: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const payload = {
      ...v,
      primaryGoal: v.primaryGoal ?? v.goals[0],
      organizationId: v.organizationId || null,
      budget: num(v.budget),
      fundingGoal: num(v.fundingGoal),
      volunteersNeeded: Number(v.volunteersNeeded || 0),
      startDate: v.startDate ? new Date(`${v.startDate}T00:00:00`).toISOString() : null,
      endDate: v.endDate ? new Date(`${v.endDate}T23:59:00`).toISOString() : null,
      impactTargets: v.impactTargets.filter((t) => t.metricId && t.targetValue).map((t) => ({ metricId: t.metricId, targetValue: Number(t.targetValue) })),
    };
    start(async () => {
      const res = projectId ? await updateProjectAction(projectId, payload) : await createProjectAction(payload);
      if (!res.ok) {
        const fe = res.fieldErrors ?? {};
        setErrors(fe);
        const shown = new Set(["title", "summary", "description", "goals", "primaryGoal", "city", "endDate", "volunteersNeeded", "budget", "fundingGoal", "currency"]);
        const hidden = Object.entries(fe).filter(([k]) => !shown.has(k)).map(([k, m]) => `${k}: ${m}`);
        setFormError(hidden.length ? `${res.error} (${hidden.join("; ")})` : res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast.success(res.message);
      router.push(`/projects/${res.data!.slug}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormError message={formError} />

      <Card>
        <CardHeader><div><CardTitle>The basics</CardTitle><CardDescription>What is the project and who is it for?</CardDescription></div></CardHeader>
        <CardContent className="space-y-5">
          <Field label="Project title" htmlFor="title" error={errors.title} required>
            <Input value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="e.g. Clean Water for Rural Schools" />
          </Field>
          <Field label="One-line summary" htmlFor="summary" error={errors.summary} hint={`${v.summary.length}/280 — shown on project cards`} required>
            <Textarea value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={280} rows={2} />
          </Field>
          <Field label="Full description" htmlFor="description" error={errors.description} hint="The problem, your approach and who benefits. Separate paragraphs with a blank line." required>
            <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={7} maxLength={6000} />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">Cover image <span className="font-normal text-ink-subtle">(optional)</span></p>
            <FileUpload id="cover" label="Upload a cover image" value={v.imageUrl} onChange={(url) => set("imageUrl", url)} />
          </div>
          {organizations.length > 0 && (
            <Field label="Run by" htmlFor="organizationId" hint="Projects under a verified organization are published immediately.">
              <Select value={v.organizationId} onChange={(e) => set("organizationId", e.target.value)}>
                <option value="">Myself (independent project)</option>
                {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}{o.verified ? " ✓" : " (pending verification)"}</option>)}
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Sustainable Development Goals</CardTitle><CardDescription>Choose up to 5 goals, then mark the main one.</CardDescription></div></CardHeader>
        <CardContent className="space-y-4">
          <GoalPicker value={v.goals} max={5} onChange={(goals) => setV((s) => ({ ...s, goals, primaryGoal: goals.includes(s.primaryGoal ?? -1) ? s.primaryGoal : (goals[0] ?? null) }))} />
          {errors.goals && <p className="text-xs font-medium text-danger" role="alert">{errors.goals}</p>}
          {v.goals.length > 1 && (
            <Field label="Primary goal" htmlFor="primaryGoal" error={errors.primaryGoal}>
              <Select value={v.primaryGoal ?? ""} onChange={(e) => set("primaryGoal", Number(e.target.value))}>
                {v.goals.map((g) => <option key={g} value={g}>Goal {g}: {sdg(g).title}</option>)}
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Objectives and volunteer tasks</CardTitle></div></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <Field label="Objectives" htmlFor="objectives" hint="Measurable outcomes, e.g. “Safe water in 8 schools by March”.">
            <ListInput value={v.objectives} onChange={(x) => set("objectives", x)} placeholder="Add an objective" />
          </Field>
          <Field label="What volunteers will do" htmlFor="tasks">
            <ListInput value={v.tasks} onChange={(x) => set("tasks", x)} placeholder="Add a task" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>When and where</CardTitle></div></CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-3 text-[15px]">
            <Checkbox checked={v.isOnline} onChange={(e) => set("isOnline", e.target.checked)} /> This project runs online
          </label>
          {!v.isOnline && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Venue or area" htmlFor="locationName" className="sm:col-span-3">
                  <Input value={v.locationName} onChange={(e) => set("locationName", e.target.value)} placeholder="e.g. Ban Non Muang School" />
                </Field>
                <Field label="City" htmlFor="city" error={errors.city} className="sm:col-span-2">
                  <Input value={v.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Country" htmlFor="country">
                  <Input value={v.country} onChange={(e) => set("country", e.target.value)} />
                </Field>
              </div>
              <LocationPicker
                value={{ lat: v.latitude, lng: v.longitude }}
                onChange={(p) => setV((s) => ({ ...s, latitude: p.lat, longitude: p.lng, city: s.city || p.city || "", country: s.country || p.country || "", locationName: s.locationName || p.name || "" }))}
              />
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="startDate"><Input type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            <Field label="End date" htmlFor="endDate" error={errors.endDate}><Input type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
            <Field label="Schedule" htmlFor="scheduleText" hint="e.g. “Saturdays, 9:00–12:00”"><Input value={v.scheduleText} onChange={(e) => set("scheduleText", e.target.value)} /></Field>
            <Field label="Commitment" htmlFor="commitment" hint="e.g. “3 hours per week”"><Input value={v.commitment} onChange={(e) => set("commitment", e.target.value)} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Volunteers</CardTitle></div></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select value={v.status} onChange={(e) => set("status", e.target.value)}>
              <option value="PLANNING">Planning — not recruiting yet</option>
              <option value="RECRUITING">Recruiting volunteers</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </Select>
          </Field>
          <Field label="Volunteers needed" htmlFor="volunteersNeeded" error={errors.volunteersNeeded}>
            <Input type="number" min={0} value={v.volunteersNeeded} onChange={(e) => set("volunteersNeeded", e.target.value)} />
          </Field>
          <Field label="Skills needed" htmlFor="skillsNeeded" className="sm:col-span-2" hint="Leave empty if no skills are required.">
            <TagInput value={v.skillsNeeded} onChange={(x) => set("skillsNeeded", x)} suggestions={SKILL_SUGGESTIONS} placeholder="Type a skill and press Enter" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Budget and impact targets</CardTitle><CardDescription>Targets let volunteers and funders see progress. Only verified contributions count towards them.</CardDescription></div></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Budget" htmlFor="budget" error={errors.budget}><Input type="number" min={0} value={v.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
            <Field label="Funding goal" htmlFor="fundingGoal" error={errors.fundingGoal}><Input type="number" min={0} value={v.fundingGoal} onChange={(e) => set("fundingGoal", e.target.value)} /></Field>
            <Field label="Currency" htmlFor="currency" error={errors.currency}>
              <Select value={v.currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP", "THB", "INR", "KES", "NGN", "BRL", "IDR", "PHP"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Impact targets</p>
            {v.impactTargets.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Select aria-label="Metric" value={t.metricId} onChange={(e) => set("impactTargets", v.impactTargets.map((x, j) => (j === i ? { ...x, metricId: e.target.value } : x)))}>
                  <option value="">Choose a metric…</option>
                  {metrics.map((m) => {
                    const usedElsewhere = v.impactTargets.some((x, j) => j !== i && x.metricId === m.id);
                    return <option key={m.id} value={m.id} disabled={usedElsewhere}>{m.name} ({m.unit}){usedElsewhere ? " — already added" : ""}</option>;
                  })}
                </Select>
                <Input aria-label="Target value" type="number" min={1} className="w-36" value={t.targetValue} placeholder="Target" onChange={(e) => set("impactTargets", v.impactTargets.map((x, j) => (j === i ? { ...x, targetValue: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label="Remove target" onClick={() => set("impactTargets", v.impactTargets.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            ))}
            {v.impactTargets.length < 8 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => set("impactTargets", [...v.impactTargets, { metricId: "", targetValue: "" }])}>
                <Plus /> Add target
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end gap-3 rounded-[var(--radius-lg)] border border-border bg-surface/95 p-3 shadow-raised backdrop-blur lg:bottom-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" size="lg" loading={pending}>{projectId ? "Save changes" : "Create project"}</Button>
      </div>
    </form>
  );
}
