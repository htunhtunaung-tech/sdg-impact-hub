import { APP_TIMEZONE, cn } from "@/lib/utils";

export function DateTile({ date, className }: { date: Date; className?: string }) {
  const d = new Date(date);
  return (
    <div className={cn("flex size-14 shrink-0 flex-col items-center justify-center rounded-[14px] bg-mint text-forest-900", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-link">{d.toLocaleString("en-GB", { month: "short", timeZone: APP_TIMEZONE })}</span>
      <span className="text-xl font-bold leading-none tabular-nums">{d.toLocaleString("en-GB", { day: "2-digit", timeZone: APP_TIMEZONE })}</span>
    </div>
  );
}
