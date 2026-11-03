"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/community/report-dialog";

export function ReportUserButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="icon" aria-label="Report this profile" onClick={() => setOpen(true)}><Flag /></Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="USER" targetId={userId} />
    </>
  );
}
