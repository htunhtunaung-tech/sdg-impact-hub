"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { reportAction } from "@/server/actions/community";

const REASONS = ["Spam", "Harassment", "Misinformation", "Inappropriate content", "Fake impact claim", "Other"];

export function ReportDialog({ open, onOpenChange, targetType, targetId }: {
  open: boolean; onOpenChange: (v: boolean) => void; targetType: "POST" | "COMMENT" | "PROJECT" | "USER" | "ORGANIZATION" | "MESSAGE"; targetId: string;
}) {
  const [reason, setReason] = useState(REASONS[0]!);
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Report content" description="Reports are confidential. A moderator will review this within 48 hours.">
        <div className="space-y-4">
          <Field label="Reason" htmlFor="report-reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Details (optional)" htmlFor="report-details">
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
          </Field>
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await reportAction({ targetType, targetId, reason, details });
                if (res.ok) {
                  toast.success(res.message);
                  onOpenChange(false);
                } else toast.error(res.error);
              })
            }
          >
            Submit report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
