"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/admin", "Overview"], ["/admin/projects", "Projects"], ["/admin/impact", "Impact review"], ["/admin/organizations", "Organizations"],
  ["/admin/reports", "Reports"], ["/admin/users", "Users"], ["/admin/sdgs", "SDG content"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Admin sections">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {ITEMS.map(([href, label]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative inline-flex h-11 items-center px-4 text-[15px]", active ? "font-semibold text-forest-900" : "text-ink-muted hover:text-ink")}>
                {label}
                {active && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-forest-900" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
