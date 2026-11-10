import type { Metadata } from "next";
import { ChatWallpaper, ChatWallpaperPicker, ChatWallpaperProvider } from "@/components/messages/chat-wallpaper";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, formatTime, timeAgo } from "@/lib/utils";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { MessageComposer } from "./composer";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const user = await requireUser("/messages");
  const withId = (await searchParams).with;

  // Latest message per conversation partner.
  const recent = await db.message.findMany({
    where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { sender: { select: { id: true, name: true, image: true } }, recipient: { select: { id: true, name: true, image: true } } },
  });
  const convos = new Map<string, { partner: { id: string; name: string; image: string | null }; last: (typeof recent)[number]; unread: number }>();
  for (const m of recent) {
    const partner = m.senderId === user.id ? m.recipient : m.sender;
    const c = convos.get(partner.id) ?? { partner, last: m, unread: 0 };
    if (m.recipientId === user.id && !m.readAt) c.unread++;
    convos.set(partner.id, c);
  }
  let partner = withId ? (convos.get(withId)?.partner ?? null) : null;
  if (withId && !partner) {
    const u = await db.user.findFirst({ where: { id: withId, status: "ACTIVE" }, select: { id: true, name: true, image: true } });
    partner = u && u.id !== user.id ? u : null;
  }
  const thread = partner
    ? await db.message.findMany({
        where: { OR: [{ senderId: user.id, recipientId: partner.id }, { senderId: partner.id, recipientId: user.id }] },
        orderBy: { createdAt: "asc" },
        take: 200,
      })
    : [];
  if (partner) await db.message.updateMany({ where: { senderId: partner.id, recipientId: user.id, readAt: null }, data: { readAt: new Date() } });

  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader title="Messages" description="Coordinate directly with organizers and volunteers." />
      <div className="grid overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-card md:grid-cols-[300px_minmax(0,1fr)]" style={{ minHeight: 520 }}>
        <aside className={cn("border-r border-border", partner && "hidden md:block")}>
          {convos.size ? (
            <ul className="divide-y divide-border">
              {[...convos.values()].map((c) => (
                <li key={c.partner.id}>
                  <Link href={`/messages?with=${c.partner.id}`} className={cn("flex gap-3 p-4 hover:bg-canvas", partner?.id === c.partner.id && "bg-mint")}>
                    <Avatar name={c.partner.name} src={c.partner.image} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2"><span className="truncate font-semibold">{c.partner.name}</span><span className="shrink-0 text-xs text-ink-subtle">{timeAgo(c.last.createdAt)}</span></span>
                      <span className={cn("block truncate text-sm", c.unread ? "font-semibold text-ink" : "text-ink-muted")}>{c.last.senderId === user.id ? "You: " : ""}{c.last.body}</span>
                    </span>
                    {c.unread > 0 && <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{c.unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="p-6 text-sm text-ink-muted">No conversations yet. Message someone from their profile.</p>}
        </aside>
        <section className={cn("flex flex-col", !partner && "hidden md:flex")}>
          {partner ? (
            <ChatWallpaperProvider>
              <header className="flex items-center gap-3 border-b border-border p-4">
                <Link href="/messages" className="md:hidden" aria-label="Back to conversations"><ArrowLeft className="size-5" /></Link>
                <Avatar name={partner.name} src={partner.image} size={36} />
                <p className="font-semibold">{partner.name}</p>
                <ChatWallpaperPicker />
              </header>
              <ChatWallpaper className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
                {thread.map((m) => (
                  <li key={m.id} className={cn("flex", m.senderId === user.id ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-[16px] px-3.5 py-2 text-[15px]", m.senderId === user.id ? "rounded-br-sm bg-primary text-white" : "chat-bubble-in rounded-bl-sm bg-surface text-ink shadow-card")}>
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className={cn("mt-0.5 text-right text-[11px]", m.senderId === user.id ? "text-emerald-100" : "text-ink-subtle")}>{formatTime(m.createdAt)}</p>
                    </div>
                  </li>
                ))}
                {!thread.length && <li className="mx-auto w-fit rounded-full bg-surface/90 px-4 py-2 text-center text-sm text-ink-muted shadow-card">Say hello to {partner.name.split(" ")[0]}.</li>}
              </ChatWallpaper>
              <MessageComposer recipientId={partner.id} />
            </ChatWallpaperProvider>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6"><EmptyState icon={<MessageSquare />} title="Select a conversation" className="border-0" /></div>
          )}
        </section>
      </div>
    </div>
  );
}
