import Link from "next/link";
import { CircleCheck, Clock, Hourglass, Info, MapPin, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { DateTile } from "@/components/volunteer/date-tile";
import { CancelSpotButton, SignUpButton } from "@/components/volunteer/signup-button";
import { formatDate, formatTimeRange } from "@/lib/utils";

export interface OpportunityRowData {
  id: string;
  title: string;
  goalId: number;
  orgName: string | null;
  startsAt: Date;
  endsAt: Date;
  isOnline: boolean;
  locationName: string;
  spots: number;
  taken: number;
  requiresApproval: boolean;
  status: string;
  myApplication?: { id: string; status: string } | null;
  distanceKm?: number | null;
}

export function OpportunityRow({ o, signedIn }: { o: OpportunityRowData; signedIn: boolean }) {
  const spotsLeft = Math.max(o.spots - o.taken, 0);
  const full = spotsLeft === 0;
  const mine = o.myApplication && o.myApplication.status !== "WITHDRAWN" ? o.myApplication : null;
  const when = `${formatDate(o.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${formatTimeRange(o.startsAt, o.endsAt)}`;
  return (
    <article className="relative flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-raised sm:flex-row sm:p-5">
      <DateTile date={o.startsAt} />
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
          <SdgNumber goal={o.goalId} size={20} /> Goal {o.goalId}
        </span>
        <h3 className="mt-1.5 text-[17px] font-semibold leading-snug">
          <Link href={`/volunteer/${o.id}`} className="hover:underline">
            {o.title}
          </Link>
        </h3>
        {o.orgName && <p className="text-sm text-ink-muted">{o.orgName}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-ink-subtle" aria-hidden /> {formatTimeRange(o.startsAt, o.endsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-ink-subtle" aria-hidden /> {o.isOnline ? "Online" : o.locationName}
            {o.distanceKm != null && <span className="text-ink-subtle">· {o.distanceKm} km</span>}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-between">
        {mine ? (
          <StatusBadge status={mine.status} />
        ) : full ? (
          <Badge variant="neutral"><Info /> Full · waitlist open</Badge>
        ) : spotsLeft <= 2 ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
            <TriangleAlert className="size-4" aria-hidden /> Only {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </span>
        ) : (
          <span className="text-sm text-ink-muted">{spotsLeft} spots left</span>
        )}
        {o.status !== "OPEN" ? (
          <Badge variant="neutral">{o.status === "CANCELLED" ? "Cancelled" : "Closed"}</Badge>
        ) : mine ? (
          mine.status !== "COMPLETED" && mine.status !== "REJECTED" ? <CancelSpotButton applicationId={mine.id} label={mine.status === "WAITLISTED" ? "Leave waitlist" : "Cancel spot"} /> : null
        ) : (
          <SignUpButton
            signedIn={signedIn}
            opp={{ id: o.id, title: o.title, org: o.orgName, when, where: o.isOnline ? "Online" : o.locationName, requiresApproval: o.requiresApproval, full }}
          />
        )}
      </div>
    </article>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return <Badge variant="success"><CircleCheck /> You're signed up</Badge>;
    case "PENDING":
      return <Badge variant="warning"><Hourglass /> Awaiting approval</Badge>;
    case "WAITLISTED":
      return <Badge variant="info"><Info /> On the waitlist</Badge>;
    case "COMPLETED":
      return <Badge variant="success"><CircleCheck /> Attended</Badge>;
    case "REJECTED":
      return <Badge variant="danger">Not accepted</Badge>;
    default:
      return null;
  }
}
