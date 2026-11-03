"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSubmissionAction } from "@/server/actions/impact";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Delete entry"
      className="rounded-md p-1 text-ink-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      onClick={() => {
        if (!confirm("Delete this entry?")) return;
        start(async () => {
          const res = await deleteSubmissionAction(id);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
