import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { aiEnabled } from "@/lib/ai";
import { AssistantChat } from "./chat";

export const metadata: Metadata = { title: "AI Sustainability Assistant" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ thread?: string; q?: string }> }) {
  const user = await requireUser("/assistant");
  const sp = await searchParams;
  const threads = await db.assistantThread.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, updatedAt: true } });
  const active = sp.thread ? await db.assistantThread.findFirst({ where: { id: sp.thread, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" } } } }) : null;
  return (
    <AssistantChat
      key={active?.id ?? "new"}
      firstName={user.name.split(" ")[0] ?? user.name}
      online={aiEnabled()}
      threads={threads.map((t) => ({ id: t.id, title: t.title, updatedAt: t.updatedAt.toISOString() }))}
      threadId={active?.id ?? null}
      initialMessages={(active?.messages ?? []).map((m) => ({ id: m.id, role: m.role === "USER" ? "user" : "assistant", content: m.content }))}
      initialPrompt={!active ? sp.q?.slice(0, 500) : undefined}
    />
  );
}
