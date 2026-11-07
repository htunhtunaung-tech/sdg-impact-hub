import { CREATOR } from "@/lib/creator";
import { cn } from "@/lib/utils";

/** "Designed & built by Htun Htun Aung · LinkedIn · GitHub" — shown in every footer. */
export function CreatorCredit({ className }: { className?: string }) {
  const link = "font-semibold text-link underline-offset-4 hover:underline";
  return (
    <p className={cn("text-[13px] text-ink-muted", className)}>
      Designed &amp; built by{" "}
      <a href={CREATOR.linkedin} target="_blank" rel="author noopener noreferrer" className={link}>
        {CREATOR.name}
      </a>
      <span aria-hidden> · </span>
      <a href={CREATOR.linkedin} target="_blank" rel="noopener noreferrer" className={link}>
        LinkedIn<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <span aria-hidden> · </span>
      <a href={CREATOR.github} target="_blank" rel="noopener noreferrer" className={link}>
        GitHub<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}
