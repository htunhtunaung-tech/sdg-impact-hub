"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, CircleCheck, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action";
import {
  addMilestoneAction, deleteMilestoneAction, deleteProjectAction, joinProjectAction, leaveProjectAction, postProjectUpdateAction,
  removeProjectMemberAction, setProjectMemberRoleAction, setProjectStatusAction, toggleMilestoneAction,
} from "@/server/actions/projects";
import { reviewImpactAction } from "@/server/actions/impact";
import { markAttendedAction, reviewApplicationAction, setOpportunityStatusAction } from "@/server/actions/volunteer";

/** Runs an action, shows a toast and refreshes server data. */
function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (res.message) toast.success(res.message);
        after?.();
        router.refresh();
      } else toast.error(res.error);
    });
  return { pending, run };
}

export function JoinProjectButton({ projectId, isMember, isOrganizer, signedIn, status, full, slug }: {
  projectId: string; isMember: boolean; isOrganizer: boolean; signedIn: boolean; status: string; full: boolean; slug: string;
}) {
  const router = useRouter();
  const { pending, run } = useAct();
  if (isOrganizer) return <Button size="lg" className="w-full" onClick={() => router.push(`/projects/${slug}?tab=manage`)}>Manage project</Button>;
  if (!signedIn) return <Button size="lg" className="w-full" onClick={() => router.push(`/login?callbackUrl=/projects/${slug}`)}>Sign in to join</Button>;
  if (isMember)
    return (
      <div className="space-y-2">
        <p className="flex items-center justify-center gap-2 rounded-[10px] bg-mint py-3 text-sm font-semibold text-forest-900"><CircleCheck className="size-4" /> You're on this team</p>
        <Button variant="ghost" className="w-full" loading={pending} onClick={() => confirm("Leave this project?") && run(() => leaveProjectAction(projectId))}>Leave project</Button>
      </div>
    );
  const disabled = status === "COMPLETED" || status === "PLANNING" || full;
  return (
    <Button size="lg" className="w-full" disabled={disabled} loading={pending} onClick={() => run(() => joinProjectAction(projectId))}>
      {status === "COMPLETED" ? "Project completed" : status === "PLANNING" ? "Not recruiting yet" : full ? "Team is full" : "Join this project"}
    </Button>
  );
}

export function ShareButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 text-sm font-semibold text-link hover:underline"
      onClick={async () => {
        const url = window.location.href.split("?")[0]!;
        if (navigator.share) {
          try { await navigator.share({ title, url }); } catch { /* cancelled */ }
        } else {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard");
        }
      }}
    >
      <Share2 className="size-4" /> Share this project
    </button>
  );
}

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: string }) {
  const { pending, run } = useAct();
  return (
    <Select aria-label="Project status" value={status} disabled={pending} onChange={(e) => run(() => setProjectStatusAction(projectId, e.target.value))} className="w-auto">
      <option value="PLANNING">Planning</option>
      <option value="RECRUITING">Recruiting</option>
      <option value="ACTIVE">Active</option>
      <option value="COMPLETED">Completed</option>
    </Select>
  );
}

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-danger hover:bg-danger-soft hover:text-danger"
      loading={pending}
      onClick={() => {
        if (!confirm("Delete this project permanently? Milestones, team and updates will be removed.")) return;
        start(async () => {
          const res = await deleteProjectAction(projectId);
          if (res.ok) {
            toast.success(res.message);
            router.push("/projects?view=mine");
          } else toast.error(res.error);
        });
      }}
    >
      <Trash2 /> Delete project
    </Button>
  );
}

export function MilestoneToggle({ id, done, title }: { id: string; done: boolean; title: string }) {
  const { pending, run } = useAct();
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => toggleMilestoneAction(id))}
        className="rounded-md px-2 py-1 text-xs font-semibold text-link hover:bg-mint disabled:opacity-50"
        aria-label={done ? `Reopen ${title}` : `Mark ${title} complete`}
      >
        {done ? "Reopen" : "Mark done"}
      </button>
      <button type="button" disabled={pending} onClick={() => confirm("Delete this milestone?") && run(() => deleteMilestoneAction(id))} className="rounded-md p-1 text-ink-subtle hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${title}`}>
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );
}

export function AddMilestoneForm({ projectId }: { projectId: string }) {
  const { pending, run } = useAct();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string>();
  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(undefined);
        run(
          async () => {
            const r = await addMilestoneAction(projectId, { title, dueDate: due || null });
            if (!r.ok) setErr(r.fieldErrors?.title ?? r.error);
            return r;
          },
          () => { setTitle(""); setDue(""); },
        );
      }}
    >
      <Field label="New milestone" htmlFor="ms-title" error={err} className="flex-1">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Install units in remaining schools" />
      </Field>
      <Field label="Due date" htmlFor="ms-due">
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending}>Add</Button>
    </form>
  );
}

export function UpdateComposer({ projectId }: { projectId: string }) {
  const { pending, run } = useAct();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          async () => {
            const r = await postProjectUpdateAction(projectId, { title, body });
            setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
            return r;
          },
          () => { setTitle(""); setBody(""); },
        );
      }}
    >
      <Field label="Headline" htmlFor="upd-title" error={errors.title}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" maxLength={120} />
      </Field>
      <Field label="Progress report" htmlFor="upd-body" error={errors.body} hint="Shared with the team and on the community feed.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder="Numbers, photos you'll share, thank-yous, what's next…" />
      </Field>
      <Button type="submit" loading={pending}>Publish update</Button>
    </form>
  );
}

export function MemberActions({ projectId, userId, role }: { projectId: string; userId: string; role: string }) {
  const { pending, run } = useAct();
  return (
    <span className="flex items-center gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setProjectMemberRoleAction(projectId, userId, role === "COORDINATOR" ? "VOLUNTEER" : "COORDINATOR"))}>
        {role === "COORDINATOR" ? "Make volunteer" : "Make coordinator"}
      </Button>
      <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Remove this member from the project?") && run(() => removeProjectMemberAction(projectId, userId))}>
        Remove
      </Button>
    </span>
  );
}

export function ReviewButtons({ submissionId }: { submissionId: string }) {
  const { pending, run } = useAct();
  return (
    <span className="flex shrink-0 gap-2">
      <Button size="sm" disabled={pending} onClick={() => run(() => reviewImpactAction({ id: submissionId, decision: "VERIFIED" }))}>
        <Check /> Verify
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          const note = prompt("Why can't this be verified? The volunteer will see this note.");
          if (note === null) return;
          run(() => reviewImpactAction({ id: submissionId, decision: "REJECTED", note }));
        }}
      >
        <X /> Decline
      </Button>
    </span>
  );
}

export function ApplicationReview({ applicationId, status, past, defaultHours }: { applicationId: string; status: string; past: boolean; defaultHours: number }) {
  const { pending, run } = useAct();
  const [hours, setHours] = useState(String(defaultHours));
  if (past && status === "APPROVED")
    return (
      <span className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`h-${applicationId}`}>Hours</label>
        <Input id={`h-${applicationId}`} type="number" min={0.5} max={24} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} className="h-8 w-20" />
        <Button size="sm" disabled={pending} onClick={() => run(() => markAttendedAction(applicationId, Number(hours)))}>
          <Check /> Attended
        </Button>
      </span>
    );
  if (past) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {status !== "APPROVED" && <Button size="sm" disabled={pending} onClick={() => run(() => reviewApplicationAction(applicationId, "APPROVED"))}>Approve</Button>}
      {status !== "WAITLISTED" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => reviewApplicationAction(applicationId, "WAITLISTED"))}>Waitlist</Button>}
      {status !== "REJECTED" && (
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          disabled={pending}
          onClick={() => {
            const note = prompt("Optional note for the applicant:");
            if (note === null) return;
            run(() => reviewApplicationAction(applicationId, "REJECTED", note || undefined));
          }}
        >
          Decline
        </Button>
      )}
    </span>
  );
}

export function OpportunityStatusButtons({ id, status }: { id: string; status: string }) {
  const { pending, run } = useAct();
  return (
    <span className="flex gap-2">
      {status === "OPEN" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setOpportunityStatusAction(id, "CLOSED"))}>Close sign-ups</Button>
      ) : status === "CLOSED" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setOpportunityStatusAction(id, "OPEN"))}>Reopen</Button>
      ) : null}
      {status !== "CANCELLED" && (
        <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Cancel this activity and notify everyone who signed up?") && run(() => setOpportunityStatusAction(id, "CANCELLED"))}>
          Cancel
        </Button>
      )}
    </span>
  );
}
