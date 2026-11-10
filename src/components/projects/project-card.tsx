import Link from "next/link";
import { Building2, CalendarDays, CircleCheck, Clock, Globe, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/misc";
import { GoalTags } from "@/components/sdg/sdg-badge";
import { SdgIcon } from "@/components/sdg/sdg-icon";
import { SaveProjectButton } from "@/components/projects/save-button";
import { sdg, sdgTint } from "@/lib/sdg";
import { cn, formatDate } from "@/lib/utils";

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  status: string;
  imageUrl: string | null;
  primaryGoal: number;
  organizationName: string | null;
  location: string;
  volunteers: number;
  volunteersNeeded: number;
  startDate: Date | null;
  scheduleText: string | null;
  saved?: boolean;
  canSave?: boolean;
  moderationStatus?: string;
  /** Other goals besides the primary one (shown as outline tags). */
  secondaryGoals?: number[];
  isOnline?: boolean;
  /** Time needed, e.g. "2 h a week" (free text from the organizer). */
  commitment?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PLANNING: "In planning",
  RECRUITING: "Open for volunteers",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export function ProjectCard({ p }: { p: ProjectCardData }) {
  const g = sdg(p.primaryGoal);
  const spotsLeft = Math.max(p.volunteersNeeded - p.volunteers, 0);
  const pct = p.volunteersNeeded ? (p.volunteers / p.volunteersNeeded) * 100 : 0;
  const when =
    p.status === "COMPLETED"
      ? "Completed"
      : p.startDate && p.startDate > new Date()
        ? `Starts ${formatDate(p.startDate, { day: "numeric", month: "short" })}`
        : (p.scheduleText ?? "Ongoing");
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-raised active:scale-[0.99]">
      <div className="relative flex h-40 items-center justify-center" style={{ background: p.imageUrl ? undefined : sdgTint(g.color, 0.16) }}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <SdgIcon goal={p.primaryGoal} className="size-12 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} style={{ color: g.color }} />
        )}
        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            p.status === "RECRUITING" ? "bg-mint text-link" : p.status === "COMPLETED" ? "bg-slate-100 text-slate-700" : "bg-white/90 text-ink",
          )}
        >
          <CircleCheck className="size-3.5" aria-hidden /> {STATUS_LABEL[p.status] ?? p.status}
        </span>
        {p.moderationStatus && p.moderationStatus !== "APPROVED" && (
          <span className="absolute bottom-3 left-3 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
            {p.moderationStatus === "PENDING_REVIEW" ? "Awaiting review" : "Not approved"}
          </span>
        )}
        {p.canSave && (
          <div className="absolute right-3 top-3 z-10">
            <SaveProjectButton projectId={p.id} saved={Boolean(p.saved)} iconOnly />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <GoalTags primary={p.primaryGoal} others={p.secondaryGoals} />
        <h3 className="mt-2 break-words text-lg font-semibold leading-snug text-ink">
          <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {p.title}
          </Link>
        </h3>
        <div className="mt-3 space-y-1 text-sm text-ink-muted">
          {p.organizationName && (
            <p className="flex min-w-0 items-center gap-2">
              <Building2 className="size-4 shrink-0 text-ink-subtle" aria-hidden /> <span className="min-w-0 truncate">{p.organizationName}</span>
            </p>
          )}
          <p className="flex min-w-0 items-center gap-2">
            {p.isOnline ? <Globe className="size-4 shrink-0 text-ink-subtle" aria-hidden /> : <MapPin className="size-4 shrink-0 text-ink-subtle" aria-hidden />}
            {p.isOnline ? (
              <span className="font-semibold text-ink">Online</span>
            ) : (
              <span className="min-w-0 truncate">
                <span className="font-semibold text-ink">In person</span>
                {p.location && <> · {p.location}</>}
              </span>
            )}
          </p>
          {p.commitment && (
            <p className="flex min-w-0 items-center gap-2">
              <Clock className="size-4 shrink-0 text-ink-subtle" aria-hidden /> <span className="sr-only">Time needed: </span>
              <span className="min-w-0 truncate" title={p.commitment}>{p.commitment}</span>
            </p>
          )}
        </div>
        {p.volunteersNeeded > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold text-ink">
                {p.volunteers} of {p.volunteersNeeded} volunteers
              </span>
              <span className="text-ink-muted">{spotsLeft} spots left</span>
            </div>
            <Progress value={pct} label="Volunteer spots filled" />
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-sm text-ink-muted [margin-top:max(1rem,auto)]">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4 text-ink-subtle" aria-hidden /> {when}
          </span>
          <span className="relative z-10 rounded-[8px] border border-border-strong px-3 py-1.5 text-sm font-semibold text-ink">View project</span>
        </div>
      </div>
    </article>
  );
}
