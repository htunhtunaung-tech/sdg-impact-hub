import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { CertificatePdf } from "@/lib/certificate-pdf";
import { certificateGoals, currentCertificate, siteUrl } from "@/lib/certificates";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDate, toNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const monthYear = (d: Date) => formatDate(d, { month: "long", year: "numeric" });

/** GET /certificate/:userId/pdf — the certificate as an A4-landscape PDF download (same on every device). */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== userId && viewer.role !== "ADMIN")) return new Response("Not found", { status: 404 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (!user) return new Response("Not found", { status: 404 });

  const cert = await currentCertificate(userId, user.name ?? user.email);
  if (!cert) return new Response("No verified hours yet, so there is no certificate to download.", { status: 404 });

  const period =
    cert.periodStart && cert.periodEnd
      ? monthYear(cert.periodStart) === monthYear(cert.periodEnd)
        ? monthYear(cert.periodStart)
        : `${monthYear(cert.periodStart)} – ${monthYear(cert.periodEnd)}`
      : null;
  const qrPng = await QRCode.toDataURL(`${await siteUrl()}/verify/${cert.code}`, { margin: 0, width: 360, errorCorrectionLevel: "M", color: { dark: "#0f3d2a", light: "#ffffff" } });

  const pdf = await renderToBuffer(
    <CertificatePdf
      d={{
        name: cert.name,
        hours: toNumber(cert.hours),
        activities: cert.activities,
        projects: cert.projects,
        peopleReached: cert.peopleReached,
        period,
        goals: certificateGoals(cert.goals),
        issued: formatDate(cert.issuedAt, { day: "numeric", month: "long", year: "numeric" }),
        code: cert.code,
        qrPng,
      }}
    />,
  );

  const file = `SDG-Impact-Hub-Certificate-${cert.code}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
