"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/forms/tag-input";
import { LocationPicker } from "@/components/map/location-picker";
import { SDGS } from "@/lib/sdg";
import { createOpportunityAction } from "@/server/actions/volunteer";

type P = { id: string; title: string; goalId: number; isOnline: boolean; locationName: string; city: string; lat: number | null; lng: number | null };

export function OpportunityForm({ projects, defaultProjectId }: { projects: P[]; defaultProjectId: string }) {
  const router = useRouter();
  const first = projects.find((p) => p.id === defaultProjectId)!;
  const [v, setV] = useState({
    projectId: first.id, title: "", description: "", goalId: first.goalId, skills: [] as string[], isOnline: first.isOnline,
    locationName: first.locationName, city: first.city, latitude: first.lat, longitude: first.lng, date: "", from: "09:00", to: "12:00", spots: "10", requiresApproval: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.date) return setErrors({ startsAt: "Choose a date" });
    const startsAt = new Date(`${v.date}T${v.from}`);
    const endsAt = new Date(`${v.date}T${v.to}`);
    start(async () => {
      const res = await createOpportunityAction({ ...v, spots: Number(v.spots), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/volunteer/${res.data!.id}`);
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <FormError message={formError} />
          <Field label="Project" htmlFor="projectId" error={errors.projectId}>
            <Select value={v.projectId} onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value)!;
              setV((s) => ({ ...s, projectId: p.id, goalId: p.goalId, isOnline: p.isOnline, locationName: p.locationName, city: p.city, latitude: p.lat, longitude: p.lng }));
            }}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>
          <Field label="Title" htmlFor="title" error={errors.title} required><Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Water filter installation" /></Field>
          <Field label="What will volunteers do?" htmlFor="description" error={errors.description} required><Textarea rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Goal" htmlFor="goalId">
            <Select value={v.goalId} onChange={(e) => set("goalId", Number(e.target.value))}>{SDGS.map((g) => <option key={g.id} value={g.id}>{g.id}. {g.title}</option>)}</Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="date" error={errors.startsAt} required><Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="From" htmlFor="from"><Input type="time" value={v.from} onChange={(e) => set("from", e.target.value)} /></Field>
            <Field label="To" htmlFor="to" error={errors.endsAt}><Input type="time" value={v.to} onChange={(e) => set("to", e.target.value)} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Spots" htmlFor="spots" error={errors.spots}><Input type="number" min={1} value={v.spots} onChange={(e) => set("spots", e.target.value)} /></Field>
            <label className="flex items-center gap-3 pt-7 text-[15px]"><Checkbox checked={v.requiresApproval} onChange={(e) => set("requiresApproval", e.target.checked)} /> I'll approve each volunteer</label>
          </div>
          <Field label="Skills" htmlFor="skills" hint="Optional"><TagInput value={v.skills} onChange={(x) => set("skills", x)} suggestions={["Teaching", "Event support", "Translation", "Coding", "Health care", "Engineering"]} /></Field>
          <label className="flex items-center gap-3 text-[15px]"><Checkbox checked={v.isOnline} onChange={(e) => set("isOnline", e.target.checked)} /> Online</label>
          {!v.isOnline && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Venue" htmlFor="locationName" error={errors.locationName} required><Input value={v.locationName} onChange={(e) => set("locationName", e.target.value)} /></Field>
                <Field label="City" htmlFor="city"><Input value={v.city} onChange={(e) => set("city", e.target.value)} /></Field>
              </div>
              <LocationPicker value={{ lat: v.latitude, lng: v.longitude }} onChange={(p) => setV((s) => ({ ...s, latitude: p.lat, longitude: p.lng }))} />
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" size="lg" loading={pending}>Publish opportunity</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
