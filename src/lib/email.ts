import "server-only";
import nodemailer from "nodemailer";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(heading: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F8FAFC;font-family:Inter,Arial,sans-serif;color:#0F172A">
  <div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:32px">
    <div style="font-weight:700;color:#14532D;margin-bottom:24px">SDG Impact Hub</div>
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(heading)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 24px">${escapeHtml(body)}</p>
    ${cta ? `<a href="${encodeURI(cta.url)}" style="display:inline-block;background:#14532D;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(cta.label)}</a>
    <p style="font-size:12px;color:#64748B;margin-top:24px">Or paste this link into your browser:<br>${escapeHtml(cta.url)}</p>` : ""}
  </div></body></html>`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  cta?: { label: string; url: string };
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}) {
  const t = getTransport();
  const text = `${opts.heading}\n\n${opts.body}${opts.cta ? `\n\n${opts.cta.label}: ${opts.cta.url}` : ""}`;
  if (!t) {
    const files = opts.attachments?.map((a) => `${a.filename} (${a.content.length} bytes)`).join(", ");
    console.info(`\n──── [email: SMTP not configured] ────\nTo: ${opts.to}\nSubject: ${opts.subject}${files ? `\nAttachments: ${files}` : ""}\n\n${text}\n──────────────────────────────────────\n`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM ?? "SDG Impact Hub <no-reply@example.org>",
      to: opts.to,
      subject: opts.subject,
      text,
      html: layout(opts.heading, opts.body, opts.cta),
      attachments: opts.attachments,
    });
  } catch (err) {
    // Email failures must never break the user flow.
    console.error("[email] send failed", err);
  }
}

export const emails = {
  verify: (to: string, name: string, token: string) =>
    sendEmail({
      to,
      subject: "Confirm your email for SDG Impact Hub",
      heading: `Welcome, ${name}!`,
      body: "Confirm your email address to start joining projects and recording your impact. This link expires in 24 hours.",
      cta: { label: "Confirm email", url: `${appUrl()}/verify-email?token=${token}` },
    }),
  reset: (to: string, token: string) =>
    sendEmail({
      to,
      subject: "Reset your SDG Impact Hub password",
      heading: "Reset your password",
      body: "Someone asked to reset the password for this account. If that was you, use the button below. The link expires in 1 hour. If it wasn't you, you can ignore this email.",
      cta: { label: "Choose a new password", url: `${appUrl()}/reset-password?token=${token}` },
    }),
  certificate: (to: string, c: { name: string; hours: string; code: string; verifyUrl: string; fileName: string; pdf: Buffer }) =>
    sendEmail({
      to,
      subject: `Your SDG Impact Hub certificate (${c.code})`,
      heading: `Congratulations, ${c.name}!`,
      body: `Your volunteer certificate for ${c.hours} verified hours is attached as a PDF, so you always have a copy. Anyone can check it is genuine by scanning its QR code or opening the link below. Certificate ID: ${c.code}.`,
      cta: { label: "Verify this certificate", url: c.verifyUrl },
      attachments: [{ filename: c.fileName, content: c.pdf, contentType: "application/pdf" }],
    }),
  notification: (to: string, title: string, body: string, link?: string | null) =>
    sendEmail({
      to,
      subject: title,
      heading: title,
      body,
      cta: link ? { label: "Open SDG Impact Hub", url: `${appUrl()}${link}` } : undefined,
    }),
};
