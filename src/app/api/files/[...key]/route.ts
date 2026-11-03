import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canReviewSubmission } from "@/lib/impact-review";
import { readUpload } from "@/lib/storage";

/** Serves uploads. Images are public; evidence files only to the submitter and its reviewers. */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (key.startsWith("evidence/")) {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Not found", { status: 404 });
    const subs = await db.impactSubmission.findMany({ where: { evidenceUrl: `/api/files/${key}` }, select: { userId: true, projectId: true } });
    let allowed = false;
    for (const s of subs) if (s.userId === user.id || (await canReviewSubmission(user, s))) allowed = true;
    // The uploader may preview a file before submitting it; nothing references it yet.
    if (!allowed && subs.length > 0) return new NextResponse("Not found", { status: 404 });
  }
  const file = await readUpload(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": file.mime === "application/pdf" ? "attachment" : "inline",
      "Cache-Control": key.startsWith("evidence/") ? "private, max-age=300" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
