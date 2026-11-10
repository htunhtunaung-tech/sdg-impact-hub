import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { CertificatePdf } from "@/lib/certificate-pdf";
import { certificateGoals, currentCertificate, siteUrl } from "@/lib/certificates";
import { formatDate, toNumber } from "@/lib/utils";

const monthYear = (d: Date) => formatDate(d, { month: "long", year: "numeric" });

/**
 * Builds the A4-landscape certificate PDF for a volunteer (issuing a new certificate code if their verified
 * hours changed). Returns null when they have no verified hours yet. Throws if rendering fails.
 */
export async function buildCertificatePdf(userId: string, name: string) {
  const cert = await currentCertificate(userId, name);
  if (!cert) return null;
  const period =
    cert.periodStart && cert.periodEnd
      ? monthYear(cert.periodStart) === monthYear(cert.periodEnd)
        ? monthYear(cert.periodStart)
        : `${monthYear(cert.periodStart)} – ${monthYear(cert.periodEnd)}`
      : null;
  const verifyUrl = `${await siteUrl()}/verify/${cert.code}`;
  const qrPng = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 360,
    errorCorrectionLevel: "M",
    color: { dark: "#0f3d2a", light: "#ffffff" },
  });
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
  return { pdf, cert, verifyUrl, fileName: `SDG-Impact-Hub-Certificate-${cert.code}.pdf` };
}
