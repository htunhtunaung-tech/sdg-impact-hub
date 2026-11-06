"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, FileText, Lightbulb, MapPin, MessageSquarePlus, Sparkles, Target, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/ui/markdown";
import { Textarea } from "@/components/ui/input";
import { cn, timeAgo } from "@/lib/utils";
import { EcoIllustration } from "@/components/brand/illustration";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const STARTERS = [
  { icon: MapPin, text: "Recommend volunteer opportunities near me" },
  { icon: Target, text: "Explain Goal 6 and how I can help locally" },
  { icon: FileText, text: "Draft a proposal for a plastic-free market campaign" },
  { icon: Lightbulb, text: "Our school has no clean drinking water. What can we do?" },
  { icon: Sparkles, text: "Make me a 4-week action plan for climate action" },
  { icon: Target, text: "How do my volunteer hours count towards the SDGs?" },
];

export function AssistantChat({ firstName, online, threads, threadId: initialThread, initialMessages, initialPrompt }: {
  firstName: string; online: boolean; threads: { id: string; title: string; updatedAt: string }[]; threadId: string | null; initialMessages: Msg[]; initialPrompt?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [threadId, setThreadId] = useState(initialThread);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(() => {
    if (initialPrompt && !sentInitial.current) {
      sentInitial.current = true;
      void send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setBusy(true);
    const assistantId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content }, { id: assistantId, role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, threadId }) });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "The assistant is unavailable.");
      }
      const newThread = res.headers.get("X-Thread-Id");
      if (newThread && newThread !== threadId) {
        setThreadId(newThread);
        window.history.replaceState(null, "", `/assistant?thread=${newThread}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content + chunk } : x)));
      }
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setMessages((m) => m.filter((x) => x.id !== assistantId));
      setInput(content);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/assistant?threadId=${id}`, { method: "DELETE" });
    if (id === threadId) router.push("/assistant");
    router.refresh();
  }

  return (
    <div className="container-page grid gap-6 py-6 sm:py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <Link href="/assistant" className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white hover:bg-primary-hover">
          <MessageSquarePlus className="size-4" /> New conversation
        </Link>
        <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">History</p>
        <ul className="space-y-0.5">
          {threads.map((t) => (
            <li key={t.id} className="group flex items-center">
              <Link href={`/assistant?thread=${t.id}`} className={cn("min-w-0 flex-1 rounded-[8px] px-2 py-2 hover:bg-slate-100", t.id === threadId && "bg-mint")}>
                <span className="block truncate text-sm">{t.title}</span>
                <span className="text-xs text-ink-subtle">{timeAgo(t.updatedAt)}</span>
              </Link>
              <button type="button" onClick={() => remove(t.id)} className="rounded-md p-1.5 text-ink-subtle opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${t.title}`}><Trash2 className="size-3.5" /></button>
            </li>
          ))}
          {!threads.length && <li className="px-2 text-sm text-ink-muted">No conversations yet.</li>}
        </ul>
      </aside>

      <section className="flex min-h-[calc(100dvh-11rem)] flex-col rounded-[var(--radius-xl)] border border-border bg-surface shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-white"><Sparkles className="size-5" /></span>
            <div><h1 className="font-semibold">Sustainability Assistant</h1><p className="text-xs text-ink-muted">Grounded in your profile and live platform data</p></div>
          </div>
          {!online && <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning" title="Set OPENAI_API_KEY to enable the language model"><WifiOff className="size-3.5" /> Offline mode</span>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-2xl text-center">
              <EcoIllustration className="mx-auto max-w-[160px]" />
              <h2 className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[38px]">Hi {firstName}, how can I help?</h2>
              <p className="mx-auto mt-3 max-w-md text-ink-muted">Ask about the goals, find opportunities, or get help drafting a proposal or action plan.</p>
              <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                {STARTERS.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <button type="button" onClick={() => send(text)} className="flex w-full items-center gap-3 rounded-[18px] bg-canvas p-3.5 text-sm font-medium transition-colors hover:bg-tone-mint">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-link shadow-card"><Icon className="size-4" /></span> {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="mx-auto max-w-3xl space-y-6" aria-live="polite">
              {messages.map((m) => (
                <motion.li key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start gap-3")}>
                  {m.role === "assistant" && <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-mint text-link"><Sparkles className="size-4" /></span>}
                  {m.role === "user" ? (
                    <p className="max-w-[85%] whitespace-pre-line rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-white">{m.content}</p>
                  ) : (
                    <div className="min-w-0 max-w-[92%]">
                      {m.content ? <Markdown text={m.content} /> : <span className="inline-flex gap-1 py-2" aria-label="Thinking"><Dot /><Dot d={0.15} /><Dot d={0.3} /></span>}
                    </div>
                  )}
                </motion.li>
              ))}
            </ol>
          )}
          <div ref={bottom} />
        </div>

        <form className="border-t border-border p-3 sm:p-4" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-[24px] border border-border-strong bg-surface p-2 pl-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-emerald-600/15">
            <label htmlFor="ask" className="sr-only">Message the assistant</label>
            <Textarea id="ask" rows={1} value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} placeholder="Ask anything about the SDGs or your next step…" className="max-h-40 min-h-10 resize-none border-0 py-2 focus:ring-0"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} />
            <button type="submit" disabled={busy || !input.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-brand disabled:opacity-40 disabled:shadow-none" aria-label="Send">
              <ArrowUp className="size-5" />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-ink-subtle">The assistant can make mistakes. Check important facts, and remember estimates aren&apos;t verified impact.</p>
        </form>
      </section>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <motion.span className="size-2 rounded-full bg-ink-subtle" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d }} />;
}
