import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const ics = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** iCalendar download for an opportunity the signed-in user has signed up for. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const app = await db.volunteerApplication.findUnique({
    where: { opportunityId_userId: { opportunityId: id, userId: user.id } },
    include: { opportunity: { include: { organization: { select: { name: true } } } } },
  });
  if (!app || app.status === "WITHDRAWN") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const o = app.opportunity;
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/volunteer/${o.id}`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SDG Impact Hub//Volunteer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${o.id}-${user.id}@sdgimpacthub`,
    `DTSTAMP:${ics(new Date())}`,
    `DTSTART:${ics(o.startsAt)}`,
    `DTEND:${ics(o.endsAt)}`,
    `SUMMARY:${esc(o.title)}`,
    `DESCRIPTION:${esc(`${o.organization?.name ? `${o.organization.name}\n` : ""}${o.description}\n\n${url}`)}`,
    `LOCATION:${esc(o.isOnline ? "Online" : o.locationName)}`,
    `URL:${url}`,
    ...(app.wantsReminder ? ["BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Tomorrow: ${o.title}`)}`, "END:VALARM"] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sdg-impact-hub-${o.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
