import type { Metadata } from "next";
import Link from "next/link";
import { Award, Bell, CircleCheck, FolderOpen, Heart, MessageCircle, MessageSquare, ShieldCheck, UserPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, timeAgo } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { MarkAllRead, DeleteNotification } from "./notification-actions";

export const metadata: Metadata = { title: "Notifications" };

const ICON = {
  APPLICATION_RECEIVED: Heart, APPLICATION_UPDATED: CircleCheck, PROJECT_UPDATE: FolderOpen, IMPACT_REVIEWED: ShieldCheck, ACHIEVEMENT_EARNED: Award,
  NEW_MESSAGE: MessageSquare, COMMENT: MessageCircle, ORGANIZATION_VERIFIED: ShieldCheck, PROJECT_REVIEWED: FolderOpen, NEW_FOLLOWER: UserPlus, SYSTEM: Bell,
} as const;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser("/notifications");
  const unreadOnly = (await searchParams).filter === "unread";
  const items = await db.notification.findMany({ where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : "You're all caught up."} actions={unread ? <MarkAllRead /> : null} />
      <LinkTabs className="mb-4" active={unreadOnly ? "unread" : "all"} tabs={[{ key: "all", label: "All", href: "/notifications" }, { key: "unread", label: `Unread (${unread})`, href: "/notifications?filter=unread" }]} />
      {items.length ? (
        <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-card">
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <li key={n.id} className={cn("flex gap-3 border-b border-border p-4 last:border-0", !n.readAt && "bg-mint/50")}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-link"><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  {n.link ? <Link href={n.link} className="font-semibold hover:underline">{n.title}</Link> : <p className="font-semibold">{n.title}</p>}
                  <p className="text-sm text-ink-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-subtle">{timeAgo(n.createdAt)}{!n.readAt && <span className="ml-2 font-semibold text-link">● New</span>}</p>
                </div>
                <DeleteNotification id={n.id} unread={!n.readAt} />
              </li>
            );
          })}
        </ul>
      ) : <EmptyState icon={<Bell />} title={unreadOnly ? "No unread notifications" : "No notifications yet"} description="Sign-up confirmations, verifications and messages will show up here." />}
    </div>
  );
}
