import Link from "next/link";
import { cn } from "@/lib/utils";

/** URL-driven tabs (server-rendered, shareable, back-button friendly). */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: string; href: string }[]; active: string; className?: string }) {
  return (
    <nav className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)} aria-label="Sections">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center px-4 text-[15px] font-medium transition-colors",
                  isActive ? "font-semibold text-forest-900" : "text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
                {isActive && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-forest-900" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
