"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteNotificationAction, markNotificationsReadAction } from "@/server/actions/community";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button variant="secondary" loading={pending} onClick={() => start(async () => { await markNotificationsReadAction(); router.refresh(); })}><CheckCheck /> Mark all as read</Button>;
}

export function DeleteNotification({ id, unread }: { id: string; unread: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <span className="flex shrink-0 items-start gap-1">
      {unread && <button type="button" disabled={pending} onClick={() => start(async () => { await markNotificationsReadAction([id]); router.refresh(); })} className="rounded-md p-1.5 text-ink-subtle hover:bg-slate-100 hover:text-ink" aria-label="Mark as read"><Check className="size-4" /></button>}
      <button type="button" disabled={pending} onClick={() => start(async () => { await deleteNotificationAction(id); router.refresh(); })} className="rounded-md p-1.5 text-ink-subtle hover:bg-slate-100 hover:text-ink" aria-label="Dismiss"><X className="size-4" /></button>
    </span>
  );
}
