"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/components/theme/theme";

/** Round sun / moon button for headers: switches between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, setMode } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? "light" : "dark")}
      className={cn("relative inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-track text-ink-muted transition-[background-color,transform] hover:bg-mint hover:text-ink active:scale-95", className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Sun className={cn("absolute size-[18px] transition-all duration-300", isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0")} aria-hidden />
      <Moon className={cn("absolute size-[18px] transition-all duration-300", isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")} aria-hidden />
    </button>
  );
}

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "Same as device", icon: Monitor },
];

/** Three-way choice for Settings. */
export function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-2 sm:grid-cols-3">
      {OPTIONS.map(({ mode: m, label, icon: Icon }) => {
        const on = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setMode(m)}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-sm font-semibold transition-colors active:scale-[0.98]",
              on ? "border-accent bg-mint text-ink" : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
