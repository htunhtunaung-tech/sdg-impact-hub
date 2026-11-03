"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action";
import { moderateProjectAction, resolveReportAction, setUserRoleAction, setUserStatusAction, updateSdgAction, verifyOrganizationAction } from "@/server/actions/admin";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    run: (fn: () => Promise<ActionResult>) =>
      start(async () => {
        const r = await fn();
        if (r.ok) { if (r.message) toast.success(r.message); router.refresh(); } else toast.error(r.error);
      }),
  };
}

export function UserRow({ userId, role, status, self }: { userId: string; role: string; status: string; self: boolean }) {
  const { pending, run } = useRun();
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Select aria-label="Role" value={role} disabled={pending || self} className="h-8 w-auto text-[13px]" onChange={(e) => run(() => setUserRoleAction(userId, e.target.value))}>
        {["INDIVIDUAL", "STUDENT", "VOLUNTEER", "ORGANIZER", "ORGANIZATION", "ADMIN"].map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}
      </Select>
      {!self && (
        <Button size="sm" variant={status === "ACTIVE" ? "ghost" : "secondary"} className={status === "ACTIVE" ? "text-danger" : ""} disabled={pending}
          onClick={() => (status === "ACTIVE" ? confirm("Suspend this account?") : true) && run(() => setUserStatusAction(userId, status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"))}>
          {status === "ACTIVE" ? "Suspend" : "Reactivate"}
        </Button>
      )}
    </span>
  );
}

export function OrgDecision({ orgId, status }: { orgId: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <span className="flex gap-2">
      {status !== "VERIFIED" && <Button size="sm" disabled={pending} onClick={() => run(() => verifyOrganizationAction(orgId, "VERIFIED"))}>Verify</Button>}
      {status !== "REJECTED" && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => verifyOrganizationAction(orgId, "REJECTED"))}>{status === "VERIFIED" ? "Revoke" : "Reject"}</Button>}
    </span>
  );
}

export function ProjectDecision({ projectId, status }: { projectId: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <span className="flex gap-2">
      {status !== "APPROVED" && <Button size="sm" disabled={pending} onClick={() => run(() => moderateProjectAction(projectId, "APPROVED"))}>Approve</Button>}
      {status !== "REJECTED" && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => {
          const note = prompt("Reason (shared with the organizer):");
          if (note !== null) run(() => moderateProjectAction(projectId, "REJECTED", note));
        }}>{status === "APPROVED" ? "Unpublish" : "Reject"}</Button>
      )}
    </span>
  );
}

export function ReportDecision({ reportId, canHide }: { reportId: string; canHide: boolean }) {
  const { pending, run } = useRun();
  return (
    <span className="flex flex-wrap gap-2">
      {canHide && <Button size="sm" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "HIDE"))}>Hide content</Button>}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => confirm("Suspend the account responsible?") && run(() => resolveReportAction(reportId, "SUSPEND"))}>Suspend author</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => resolveReportAction(reportId, "DISMISS"))}>Dismiss</Button>
    </span>
  );
}

export function SdgEditor({ goal }: { goal: { id: number; tagline: string; description: string; challenges: string[]; waysToContribute: string[]; isActive: boolean } }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ ...goal, challenges: goal.challenges.join("\n"), waysToContribute: goal.waysToContribute.join("\n") });
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      run(() => updateSdgAction({ ...v, challenges: v.challenges.split("\n").map((s) => s.trim()).filter(Boolean), waysToContribute: v.waysToContribute.split("\n").map((s) => s.trim()).filter(Boolean) }));
    }}>
      <Field label="Tagline" htmlFor={`t-${goal.id}`}><Input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></Field>
      <Field label="Description" htmlFor={`d-${goal.id}`}><Textarea rows={4} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Global challenges (one per line)" htmlFor={`c-${goal.id}`}><Textarea rows={5} value={v.challenges} onChange={(e) => setV({ ...v, challenges: e.target.value })} /></Field>
        <Field label="Ways to contribute (one per line)" htmlFor={`w-${goal.id}`}><Textarea rows={5} value={v.waysToContribute} onChange={(e) => setV({ ...v, waysToContribute: e.target.value })} /></Field>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.isActive} onChange={(e) => setV({ ...v, isActive: e.target.checked })} /> Visible on the platform</label>
        <Button type="submit" size="sm" loading={pending}>Save Goal {goal.id}</Button>
      </div>
    </form>
  );
}
