"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox, Textarea } from "@/components/ui/input";
import { applyToOpportunityAction, withdrawApplicationAction } from "@/server/actions/volunteer";

export interface SignupOpp {
  id: string;
  title: string;
  org: string | null;
  when: string;
  where: string;
  requiresApproval: boolean;
  full: boolean;
}

export function SignUpButton({ opp, signedIn, size = "sm", className }: { opp: SignupOpp; signedIn: boolean; size?: "sm" | "md" | "lg"; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [calendar, setCalendar] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [motivation, setMotivation] = useState("");

  if (!signedIn)
    return (
      <Button size={size} className={className} onClick={() => router.push(`/login?callbackUrl=/volunteer/${opp.id}`)}>
        Sign in to sign up
      </Button>
    );

  const confirm = () =>
    start(async () => {
      const res = await applyToOpportunityAction({ opportunityId: opp.id, wantsReminder: reminder, motivation: motivation || undefined });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      if (calendar && res.data?.status !== "WAITLISTED") window.location.href = `/api/calendar/${opp.id}`;
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={opp.full ? "secondary" : "primary"} className={className}>
          {opp.full ? "Join waitlist" : opp.requiresApproval ? "Apply" : "Sign up"}
        </Button>
      </DialogTrigger>
      <DialogContent title={opp.full ? "Join the waitlist" : "Confirm your spot"} description={opp.requiresApproval && !opp.full ? "The organizer reviews applications and will confirm your spot." : undefined}>
        <div className="rounded-[12px] border border-border bg-canvas p-4">
          <p className="font-semibold">{opp.title}</p>
          {opp.org && <p className="text-sm text-ink-muted">{opp.org}</p>}
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <CalendarDays className="size-4" /> {opp.when}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
            <MapPin className="size-4" /> {opp.where}
          </p>
        </div>
        {opp.requiresApproval && (
          <div className="mt-4 space-y-1.5">
            <label htmlFor={`motivation-${opp.id}`} className="text-sm font-medium">
              Anything the organizer should know? <span className="font-normal text-ink-subtle">(optional)</span>
            </label>
            <Textarea id={`motivation-${opp.id}`} value={motivation} onChange={(e) => setMotivation(e.target.value)} maxLength={1000} placeholder="Relevant experience, languages, accessibility needs…" />
          </div>
        )}
        <div className="mt-4 space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-[15px]">
            <Checkbox checked={calendar} onChange={(e) => setCalendar(e.target.checked)} /> Add to my calendar
          </label>
          <label className="flex min-h-11 items-center gap-3 text-[15px]">
            <Checkbox checked={reminder} onChange={(e) => setReminder(e.target.checked)} /> Send me a reminder the day before
          </label>
        </div>
        <Button size="lg" className="mt-5 w-full" loading={pending} onClick={confirm}>
          {opp.full ? "Join waitlist" : opp.requiresApproval ? "Send application" : "Confirm sign-up"}
        </Button>
        <DialogClose asChild>
          <Button variant="link" className="mt-3 w-full">
            Cancel
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function CancelSpotButton({ applicationId, label = "Cancel spot" }: { applicationId: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="link"
      size="sm"
      className="text-link"
      loading={pending}
      onClick={() => {
        if (!confirm("Cancel your spot? It will be offered to the next person on the waitlist.")) return;
        start(async () => {
          const res = await withdrawApplicationAction(applicationId);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      {label}
    </Button>
  );
}
