"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FileUpload } from "@/components/forms/file-upload";
import { completeChallengeAction } from "@/server/actions/challenges";

export function CompleteChallenge({ id, title, requiresEvidence, metric }: { id: string; title: string; requiresEvidence: boolean; metric: { name: string; unit: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const submit = () =>
    start(async () => {
      const res = await completeChallengeAction(id, { note, evidenceUrl: evidence ?? undefined, value: value ? Number(value) : undefined });
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });
  if (!requiresEvidence) return <Button size="sm" loading={pending} onClick={submit}>I did it</Button>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Submit evidence</Button></DialogTrigger>
      <DialogContent title={title} description="Add a photo. A reviewer verifies it before XP is awarded.">
        <div className="space-y-4">
          <FileUpload id={`ev-${id}`} kind="evidence" label="Upload a photo" value={evidence} onChange={setEvidence} />
          {metric && <Field label={`${metric.name} (${metric.unit})`} htmlFor={`val-${id}`} hint="Only if you measured it"><Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>}
          <Field label="Note (optional)" htmlFor={`note-${id}`}><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
          <Button className="w-full" loading={pending} disabled={!evidence} onClick={submit}>Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
