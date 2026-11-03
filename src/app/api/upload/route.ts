import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { saveUpload, UploadError, type UploadKind } from "@/lib/storage";

/** Same-origin check — route handlers don't get Server Actions' built-in CSRF protection. */
function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await rateLimit(`upload:${user.id}`, 20, 3600))) return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = (form?.get("kind") === "evidence" ? "evidence" : "image") as UploadKind;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const { url } = await saveUpload(file, kind);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[upload]", e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
