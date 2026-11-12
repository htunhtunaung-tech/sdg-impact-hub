"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/forms/file-upload";
import { createOrganizationAction } from "@/server/actions/organizations";

const TYPES = [["NGO", "NGO / non-profit"], ["UNIVERSITY", "University"], ["SCHOOL", "School"], ["COMPANY", "Company"], ["COMMUNITY_GROUP", "Community group"], ["YOUTH_ORGANIZATION", "Youth organization"], ["GOVERNMENT", "Government body"]];

export function OrganizationForm() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", type: "NGO", description: "", mission: "", website: "", email: "", logoUrl: null as string | null, city: "", country: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v, val: string | null) => setV((s) => ({ ...s, [k]: val }));
  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await createOrganizationAction({ ...v, logoUrl: v.logoUrl ?? undefined });
        if (!res.ok) { setErrors(res.fieldErrors ?? {}); setFormError(res.error); return; }
        toast.success(res.message);
        router.push(`/organizations/${res.data!.slug}`);
      });
    }}>
      <Card>
        <CardContent className="space-y-5 pt-6">
          <FormError message={formError} />
          <Field label="Name" htmlFor="name" error={errors.name} required><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Type" htmlFor="type"><Select value={v.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Description" htmlFor="description" error={errors.description} required><Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={4} /></Field>
          <Field label="Mission" htmlFor="mission" error={errors.mission}><Input value={v.mission} onChange={(e) => set("mission", e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website" htmlFor="website" error={errors.website}><Input type="url" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
            <Field label="Contact email" htmlFor="email" error={errors.email}><Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="City" htmlFor="city"><Input value={v.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="Country" htmlFor="country"><Input value={v.country} onChange={(e) => set("country", e.target.value)} /></Field>
          </div>
          <div><p className="mb-1.5 text-sm font-medium">Logo</p><FileUpload id="logo" label="Upload a logo" value={v.logoUrl} onChange={(u) => set("logoUrl", u)} /></div>
          <div className="flex justify-end"><Button type="submit" size="lg" loading={pending}>Submit for verification</Button></div>
        </CardContent>
      </Card>
    </form>
  );
}
