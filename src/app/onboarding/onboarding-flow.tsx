"use client";

import { celebrate } from "@/lib/confetti";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Building2, Check, GraduationCap, HandHeart, Megaphone, Sprout, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/controls";
import { GoalPicker } from "@/components/sdg/goal-picker";
import { TagInput } from "@/components/forms/tag-input";
import { EcoIllustration } from "@/components/brand/illustration";
import { completeOnboardingAction, skipOnboardingAction } from "@/server/actions/profile";
import { cn } from "@/lib/utils";

type Role = "INDIVIDUAL" | "STUDENT" | "VOLUNTEER" | "ORGANIZER" | "ORGANIZATION" | "YOUTH_ORGANIZATION";
interface Values {
  role: string;
  goals: number[];
  skills: string[];
  interests: string[];
  city: string;
  country: string;
  emailNotifications: boolean;
}

const ROLES: { value: Role; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: "VOLUNTEER", label: "Volunteer", sub: "Give time to local projects and events", icon: <HandHeart /> },
  { value: "STUDENT", label: "Student", sub: "Learn, earn certificates and build experience", icon: <GraduationCap /> },
  { value: "ORGANIZER", label: "Project organizer", sub: "Run a project and recruit volunteers", icon: <Megaphone /> },
  { value: "ORGANIZATION", label: "NGO or organization", sub: "Represent a team and verify impact", icon: <Building2 /> },
  { value: "YOUTH_ORGANIZATION", label: "Youth organization", sub: "Lead a youth group, club or student-led initiative", icon: <Sprout /> },
  { value: "INDIVIDUAL", label: "Just exploring", sub: "Follow goals and see what's happening", icon: <UserRound /> },
];
const SKILLS = ["Teaching", "Coding", "Design", "Event support", "Translation", "Health care", "Photography", "Data analysis", "Fundraising", "Social media", "Engineering", "Project management"];
const INTERESTS = ["Education", "Clean water", "Climate", "Health", "Food", "Gender equality", "Recycling", "Wildlife", "Digital literacy", "Local business"];
const STEPS = ["Your role", "Goals", "Skills", "Location"];

function Chips({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
              on ? "border-primary bg-primary text-white" : "border-border-strong bg-surface text-ink hover:border-forest-900",
            )}
          >
            {on && <Check className="size-4" aria-hidden />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingFlow({ firstName, initial }: { firstName: string; initial: Values }) {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = welcome screen
  const [v, setV] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

  const next = () => {
    setError(null);
    if (step === 1 && !v.goals.length) return setError("Pick at least one goal so we can recommend projects.");
    if (step < STEPS.length - 1) return setStep(step + 1);
    start(async () => {
      const res = await completeOnboardingAction(v);
      if (!res.ok) return setError(res.error);
      toast.success(res.message);
      celebrate();
      router.push("/dashboard");
      router.refresh();
    });
  };
  const skip = () =>
    start(async () => {
      await skipOnboardingAction();
      router.push("/dashboard");
      router.refresh();
    });

  if (step === -1)
    return (
      <section className="mx-auto flex max-w-md flex-col items-center text-center" aria-labelledby="welcome-title">
        <EcoIllustration className="max-w-[300px]" />
        <h1 id="welcome-title" className="mt-4 text-[32px] font-bold leading-tight tracking-tight text-ink sm:text-[40px]">
          Welcome, {firstName}. Let's find your place in the Global Goals.
        </h1>
        <p className="mt-3 text-base text-ink-muted">Four quick questions so we can recommend projects, volunteer sessions and people near you. It takes about a minute.</p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <Button size="lg" className="w-full" onClick={() => setStep(0)}>
            Get started <ArrowRight />
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={skip} loading={pending}>
            Skip for now
          </Button>
        </div>
      </section>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper steps={STEPS} current={step} className="mb-6 sm:mb-8" />
      <Card className="p-5 sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          noValidate
        >
          {step === 0 && (
            <fieldset>
              <legend className="text-2xl font-bold tracking-tight">How will you take part?</legend>
              <p className="mt-1 text-ink-muted">You can change this any time in Settings.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => {
                  const on = v.role === r.value;
                  return (
                    <label
                      key={r.value}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[18px] border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                        on ? "border-primary bg-mint" : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <input type="radio" name="role" value={r.value} checked={on} onChange={() => set("role", r.value)} className="sr-only" />
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5", on ? "bg-primary text-white" : "bg-mint text-link")}>{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{r.label}</span>
                        <span className="block text-[13px] text-ink-muted">{r.sub}</span>
                      </span>
                      <span className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-white" : "border-border-strong")} aria-hidden>
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="text-2xl font-bold tracking-tight">Which goals matter most to you?</legend>
              <p className="mt-1 text-ink-muted">Pick as many as you like. We use them to tailor your recommendations.</p>
              <div className="mt-6">
                <GoalPicker value={v.goals} onChange={(g) => set("goals", g)} />
              </div>
              <p className="mt-3 text-sm text-ink-muted" aria-live="polite">{v.goals.length} selected</p>
            </fieldset>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">What can you bring?</h2>
              <p className="mt-1 text-ink-muted">Organizers look for these when they recruit. Add your own if they're not listed.</p>
              <h3 className="mt-6 text-sm font-semibold text-ink">Skills</h3>
              <div className="mt-2">
                <Chips label="Skills" options={SKILLS} value={v.skills} onChange={(s) => set("skills", s)} />
              </div>
              <div className="mt-3">
                <TagInput id="custom-skills" value={v.skills.filter((s) => !SKILLS.includes(s))} onChange={(c) => set("skills", [...v.skills.filter((s) => SKILLS.includes(s)), ...c])} placeholder="Add another skill and press Enter" />
              </div>
              <h3 className="mt-6 text-sm font-semibold text-ink">Interests</h3>
              <div className="mt-2">
                <Chips label="Interests" options={INTERESTS} value={v.interests} onChange={(s) => set("interests", s)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Where are you based?</h2>
              <p className="mt-1 text-ink-muted">We'll show opportunities nearby first. Only your city is shown on your profile.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="City" htmlFor="city">
                  <Input value={v.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" placeholder="e.g. Khon Kaen" />
                </Field>
                <Field label="Country" htmlFor="country">
                  <Input value={v.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" placeholder="e.g. Thailand" />
                </Field>
              </div>
              <div className="mt-6 rounded-[18px] bg-canvas p-4">
                <Switch label="Email me about new matches" description="A short digest when projects match your goals. Unsubscribe any time." checked={v.emailNotifications} onCheckedChange={(c) => set("emailNotifications", c)} />
              </div>
            </div>
          )}

          <div className="mt-6"><FormError message={error} /></div>
          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="link" onClick={skip} disabled={pending} className="justify-center">Skip for now</Button>
              <Button type="submit" size="lg" loading={pending}>
                {step === STEPS.length - 1 ? "Finish and see my matches" : "Continue"} {step < STEPS.length - 1 && <ArrowRight />}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
