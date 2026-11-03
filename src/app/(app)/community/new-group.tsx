"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SDGS } from "@/lib/sdg";
import { createGroupAction } from "@/server/actions/community";

export function NewGroupButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: "", description: "", goalId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Create a group"><Plus /></Button></DialogTrigger>
      <DialogContent title="Create a discussion group">
        <div className="space-y-4">
          <Field label="Name" htmlFor="g-name" error={errors.name}><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="What is it for?" htmlFor="g-desc" error={errors.description}><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
          <Field label="Goal (optional)" htmlFor="g-goal">
            <Select value={v.goalId} onChange={(e) => setV({ ...v, goalId: e.target.value })}>
              <option value="">None</option>
              {SDGS.map((g) => <option key={g.id} value={g.id}>{g.id}. {g.shortTitle}</option>)}
            </Select>
          </Field>
          <Button className="w-full" loading={pending} onClick={() => start(async () => {
            const res = await createGroupAction({ ...v, goalId: v.goalId ? Number(v.goalId) : null });
            if (!res.ok) { setErrors(res.fieldErrors ?? {}); toast.error(res.error); return; }
            toast.success(res.message);
            setOpen(false);
            router.push(`/community/groups/${res.data!.slug}`);
          })}>Create group</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
