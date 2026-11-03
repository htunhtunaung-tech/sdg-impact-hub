"use client";

import { useOptimistic, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleSaveProjectAction } from "@/server/actions/projects";
import { cn } from "@/lib/utils";

export function SaveProjectButton({ projectId, saved, iconOnly = false }: { projectId: string; saved: boolean; iconOnly?: boolean }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const toggle = () =>
    start(async () => {
      setOptimistic(!optimistic);
      const res = await toggleSaveProjectAction(projectId);
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message);
    });
  if (iconOnly)
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimistic}
        aria-label={optimistic ? "Remove from saved" : "Save for later"}
        className={cn("flex size-9 items-center justify-center rounded-full bg-white/95 shadow-card transition-colors hover:bg-white", optimistic ? "text-forest-900" : "text-ink")}
      >
        {optimistic ? <BookmarkCheck className="size-[18px] fill-current" /> : <Bookmark className="size-[18px]" />}
      </button>
    );
  return (
    <Button variant="secondary" size="lg" className="w-full" onClick={toggle} disabled={pending} aria-pressed={optimistic}>
      {optimistic ? <BookmarkCheck className="fill-current" /> : <Bookmark />} {optimistic ? "Saved" : "Save for later"}
    </Button>
  );
}
