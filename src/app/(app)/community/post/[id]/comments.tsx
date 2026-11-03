"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addCommentAction, deleteCommentAction } from "@/server/actions/community";

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="mt-6 space-y-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const res = await addCommentAction({ postId, body });
        if (res.ok) { setBody(""); router.refresh(); } else toast.error(res.error);
      });
    }}>
      <label htmlFor="comment" className="text-sm font-medium">Add a comment</label>
      <Textarea id="comment" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} rows={3} />
      <div className="flex justify-end"><Button type="submit" loading={pending} disabled={!body.trim()}>Comment</Button></div>
    </form>
  );
}

export function DeleteCommentButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label="Delete comment" className="self-start rounded-md p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger"
      onClick={() => confirm("Delete this comment?") && start(async () => {
        const res = await deleteCommentAction(id);
        if (res.ok) router.refresh(); else toast.error(res.error);
      })}>
      <Trash2 className="size-4" />
    </button>
  );
}
