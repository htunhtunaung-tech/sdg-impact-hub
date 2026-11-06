"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { GoalPicker } from "@/components/sdg/goal-picker";
import { TagInput } from "@/components/forms/tag-input";
import { FileUpload } from "@/components/forms/file-upload";
import { LocationPicker } from "@/components/map/location-picker";
import { changePasswordAction, deleteAccountAction, updatePrivacyAction, updateProfileAction } from "@/server/actions/profile";

type Profile = {
  name: string; username: string; role: string; image: string | null; headline: string; bio: string; city: string; country: string;
  latitude: number | null; longitude: number | null; website: string; skills: string[]; interests: string[]; goals: number[];
};

export function SettingsForms({ profile, privacy, email, hasPassword, googleLinked, isAdmin }: {
  profile: Profile; privacy: { isPublic: boolean; showOnLeaderboard: boolean; emailNotifications: boolean }; email: string; hasPassword: boolean; googleLinked: boolean; isAdmin: boolean;
}) {
  const router = useRouter();
  const [p, setP] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  const [priv, setPriv] = useState(privacy);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [confirmEmail, setConfirmEmail] = useState("");

  return (
    <div className="space-y-6">
      <form noValidate onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await updateProfileAction({ ...p, image: p.image ?? undefined, website: p.website || undefined });
          if (!res.ok) { setErrors(res.fieldErrors ?? {}); setFormError(res.error); return; }
          setErrors({});
          toast.success(res.message);
          router.refresh();
        });
      }}>
        <Card>
          <CardHeader><div><CardTitle>Profile</CardTitle><CardDescription>Shown on your public profile and used for recommendations.</CardDescription></div></CardHeader>
          <CardContent className="space-y-5">
            <FormError message={formError} />
            <div><p className="mb-1.5 text-sm font-medium">Profile photo</p><FileUpload id="avatar" label="Upload a photo" value={p.image} onChange={(u) => set("image", u)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={errors.name} required><Input value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Username" htmlFor="username" error={errors.username} required><Input value={p.username} onChange={(e) => set("username", e.target.value.toLowerCase())} /></Field>
            </div>
            {!isAdmin && (
              <Field label="I'm a…" htmlFor="role">
                <Select value={p.role} onChange={(e) => set("role", e.target.value)}>
                  <option value="INDIVIDUAL">Individual</option><option value="STUDENT">Student</option><option value="VOLUNTEER">Volunteer</option>
                  <option value="ORGANIZER">Project organizer</option><option value="ORGANIZATION">NGO / Organization representative</option>
                </Select>
              </Field>
            )}
            <Field label="Headline" htmlFor="headline" error={errors.headline}><Input value={p.headline} onChange={(e) => set("headline", e.target.value)} maxLength={120} placeholder="e.g. Teacher & weekend volunteer" /></Field>
            <Field label="Bio" htmlFor="bio" error={errors.bio}><Textarea value={p.bio} onChange={(e) => set("bio", e.target.value)} maxLength={800} /></Field>
            <Field label="Website" htmlFor="website" error={errors.website}><Input type="url" value={p.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
            <Field label="Skills" htmlFor="skills" hint="Used to match you with opportunities.">
              <TagInput value={p.skills} onChange={(v) => set("skills", v)} max={25} suggestions={["Teaching", "Coding", "Design", "Event support", "Translation", "Health care", "Engineering", "Data analysis", "Photography", "Mentoring"]} />
            </Field>
            <Field label="Interests" htmlFor="interests"><TagInput value={p.interests} onChange={(v) => set("interests", v)} max={25} /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Goals you follow</legend>
              <GoalPicker value={p.goals} onChange={(v) => set("goals", v)} compact />
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Location</legend>
              <p className="text-xs text-ink-subtle">Used for “near me” matches. Only your city is shown publicly — never your coordinates.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City" htmlFor="city"><Input value={p.city} onChange={(e) => set("city", e.target.value)} /></Field>
                <Field label="Country" htmlFor="country"><Input value={p.country} onChange={(e) => set("country", e.target.value)} /></Field>
              </div>
              <LocationPicker value={{ lat: p.latitude, lng: p.longitude }} onChange={(loc) => setP((s) => ({ ...s, latitude: loc.lat, longitude: loc.lng, city: s.city || loc.city || "", country: s.country || loc.country || "" }))} />
              {p.latitude != null && <button type="button" className="text-xs font-semibold text-link hover:underline" onClick={() => setP((s) => ({ ...s, latitude: null, longitude: null }))}>Clear pinned location</button>}
            </fieldset>
            <div className="flex justify-end"><Button type="submit" loading={pending}>Save profile</Button></div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader><div><CardTitle>Privacy & notifications</CardTitle></div></CardHeader>
        <CardContent className="space-y-4">
          {([
            ["isPublic", "Public profile", "Anyone can see your profile, badges and verified impact."],
            ["showOnLeaderboard", "Show me on leaderboards", "Your name and verified hours appear in community rankings."],
            ["emailNotifications", "Email notifications", "Sign-up confirmations, approvals and reminders by email."],
          ] as const).map(([k, title, desc]) => (
            <label key={k} className="flex items-start gap-3">
              <Checkbox checked={priv[k]} onChange={(e) => setPriv({ ...priv, [k]: e.target.checked })} className="mt-0.5" />
              <span><span className="block font-medium">{title}</span><span className="text-sm text-ink-muted">{desc}</span></span>
            </label>
          ))}
          <div className="flex justify-end">
            <Button variant="secondary" loading={pending} onClick={() => start(async () => { const r = await updatePrivacyAction(priv); if (r.ok) toast.success(r.message); else toast.error(r.error); })}>Save preferences</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Sign-in & security</CardTitle><CardDescription>{email}{googleLinked && " · Google account linked"}</CardDescription></div></CardHeader>
        <CardContent>
          <form className="space-y-4" noValidate onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await changePasswordAction(pw);
              if (r.ok) { toast.success(r.message); setPw({ currentPassword: "", newPassword: "" }); setPwErrors({}); } else { setPwErrors(r.fieldErrors ?? {}); toast.error(r.error); }
            });
          }}>
            {hasPassword && <Field label="Current password" htmlFor="currentPassword" error={pwErrors.currentPassword}><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>}
            <Field label={hasPassword ? "New password" : "Set a password"} htmlFor="newPassword" error={pwErrors.newPassword} hint="At least 8 characters, with a letter and a number."><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <div className="flex justify-end"><Button type="submit" variant="secondary" loading={pending}>Update password</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Your data</CardTitle><CardDescription>Download everything we store about you, or delete your account.</CardDescription></div></CardHeader>
        <CardContent className="space-y-6">
          <Button variant="secondary" asChild><a href="/api/me/export"><Download /> Download my data (JSON)</a></Button>
          <div className="rounded-[16px] border border-red-200 bg-danger-soft/60 p-4">
            <p className="flex items-center gap-2 font-semibold text-danger"><TriangleAlert className="size-4" /> Delete account</p>
            <p className="mt-1 text-sm text-ink-muted">This permanently deletes your profile, contributions, messages and posts. It can&apos;t be undone.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={`Type ${email} to confirm`} aria-label="Confirm your email" />
              <Button variant="danger" disabled={confirmEmail.trim().toLowerCase() !== email} loading={pending} onClick={() => start(async () => { const r = await deleteAccountAction(confirmEmail); if (r && !r.ok) toast.error(r.error); })}>Delete account</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
