import { after } from "next/server";
import { buildCertificatePdf } from "@/lib/certificate-file";
import { db } from "@/lib/db";
import { emails } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { formatNumber, toNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "htunhtunaung.h@kkumail.com" -> "ht***@kkumail.com", so the address isn't shown in full on screen. */
const mask = (email: string) => email.replace(/^(.{1,2})[^@]*(@.*)$/, "$1***$2");

/**
 * GET /certificate/:userId/pdf — the certificate as an A4-landscape PDF download (same on every device).
 * With ?email=1 (the Download button) a copy is also emailed to the volunteer after the response is sent,
 * at most 3 times an hour; the X-Certificate-Emailed header tells the button what happened.
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== userId && viewer.role !== "ADMIN")) return new Response("Not found", { status: 404 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return new Response("Not found", { status: 404 });

  let built: Awaited<ReturnType<typeof buildCertificatePdf>>;
  try {
    built = await buildCertificatePdf(userId, user.name ?? user.email);
  } catch (err) {
    console.error("[certificate-pdf] render failed", err);
    return new Response(`The certificate PDF could not be created (${err instanceof Error ? err.name : "error"}). Please try again later.`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (!built) return new Response("No verified hours yet, so there is no certificate to download.", { status: 404 });
  const { pdf, cert, verifyUrl, fileName } = built;

  // Only email the owner's own copy (not when an admin downloads someone else's).
  let emailed = "no";
  if (new URL(req.url).searchParams.get("email") === "1" && viewer.id === userId) {
    if (await rateLimit(`cert-email:${userId}`, 3, 3600)) {
      emailed = mask(user.email);
      after(() =>
        emails.certificate(user.email, {
          name: cert.name,
          hours: formatNumber(toNumber(cert.hours)),
          code: cert.code,
          verifyUrl,
          fileName,
          pdf,
        }),
      );
    } else emailed = "limit";
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Certificate-Emailed": emailed,
    },
  });
}
