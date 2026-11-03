"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { sendMessageAction } from "@/server/actions/community";

export function MessageComposer({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const send = () => {
    if (!body.trim()) return;
    start(async () => {
      const res = await sendMessageAction({ recipientId, body });
      if (res.ok) { setBody(""); router.refresh(); } else toast.error(res.error);
    });
  };
  return (
    <form className="flex items-end gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label htmlFor="msg" className="sr-only">Message</label>
      <Textarea id="msg" rows={1} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Write a message…" className="min-h-10 resize-none"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <Button type="submit" size="icon" loading={pending} aria-label="Send" disabled={!body.trim()}>{!pending && <SendHorizontal />}</Button>
    </form>
  );
}
