import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { assistantSchema } from "@/lib/validation";
import { streamAssistantReply } from "@/lib/ai";

export const runtime = "nodejs";

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return Boolean(origin && host && new URL(origin).host === host);
  } catch {
    return false;
  }
}

/** Streams an assistant reply as text and persists both turns to the thread. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await rateLimit(`assistant:min:${user.id}`, 10, 60)) || !(await rateLimit(`assistant:day:${user.id}`, 150, 86400))) {
    return NextResponse.json({ error: "You've sent a lot of messages. Please wait a little and try again." }, { status: 429 });
  }
  const parsed = assistantSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must be between 1 and 4,000 characters." }, { status: 400 });
  const { message, threadId } = parsed.data;

  let thread = threadId ? await db.assistantThread.findFirst({ where: { id: threadId, userId: user.id } }) : null;
  if (threadId && !thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  thread ??= await db.assistantThread.create({ data: { userId: user.id, title: message.slice(0, 60) } });
  await db.assistantMessage.create({ data: { threadId: thread.id, role: "USER", content: message } });
  const history = await db.assistantMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" }, take: 30 });

  let iterator: AsyncIterable<string>;
  try {
    iterator = await streamAssistantReply(user, history.map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content })));
  } catch (e) {
    console.error("[assistant]", e);
    return NextResponse.json({ error: "The assistant is unavailable right now. Please try again." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const id = thread.id;
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of iterator) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (e) {
        console.error("[assistant stream]", e);
        const msg = "\n\n_Sorry — the response was interrupted. Please try again._";
        full += msg;
        controller.enqueue(encoder.encode(msg));
      } finally {
        if (full.trim()) {
          await db.assistantMessage.create({ data: { threadId: id, role: "ASSISTANT", content: full } });
          await db.assistantThread.update({ where: { id }, data: { updatedAt: new Date() } });
        }
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Thread-Id": id } });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("threadId") ?? "";
  await db.assistantThread.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
