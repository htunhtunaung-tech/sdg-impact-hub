"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Popover } from "radix-ui";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const WALLS = [
  { key: "leaves", label: "Leaves" },
  { key: "forest", label: "Forest" },
  { key: "ocean", label: "Ocean" },
  { key: "sunrise", label: "Sunrise" },
  { key: "plain", label: "Plain" },
] as const;
type Wall = (typeof WALLS)[number]["key"];
const KEY = "chat-wallpaper";

const Ctx = createContext<{ wall: Wall; setWall: (w: Wall) => void }>({ wall: "leaves", setWall: () => {} });

/** Remembers the chosen chat wallpaper on this device (Leaves by default). */
export function ChatWallpaperProvider({ children }: { children: React.ReactNode }) {
  const [wall, set] = useState<Wall>("leaves");
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (WALLS.some((w) => w.key === v)) set(v as Wall);
    } catch {}
  }, []);
  const setWall = (w: Wall) => {
    set(w);
    try {
      localStorage.setItem(KEY, w);
    } catch {}
  };
  return <Ctx.Provider value={{ wall, setWall }}>{children}</Ctx.Provider>;
}

/** The scrolling message list, drawn over the chosen nature wallpaper. */
export function ChatWallpaper({ className, children, ...props }: React.ComponentProps<"ol">) {
  const { wall } = useContext(Ctx);
  return (
    <ol className={cn(`chat-wall-${wall} transition-[background] duration-300`, className)} {...props}>
      {children}
    </ol>
  );
}

/** Palette button for the conversation header: pick a wallpaper. */
export function ChatWallpaperPicker() {
  const { wall, setWall } = useContext(Ctx);
  return (
    <Popover.Root>
      <Popover.Trigger
        className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-[background-color,transform] hover:bg-track hover:text-ink active:scale-95"
        aria-label="Change chat wallpaper"
        title="Chat wallpaper"
      >
        <Palette className="size-5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[272px] rounded-[18px] border border-border bg-surface p-3 shadow-overlay">
          <p className="px-1 pb-2 text-sm font-semibold">Chat wallpaper</p>
          <div role="radiogroup" aria-label="Chat wallpaper" className="grid grid-cols-3 gap-2">
            {WALLS.map((w) => (
              <button
                key={w.key}
                type="button"
                role="radio"
                aria-checked={wall === w.key}
                onClick={() => setWall(w.key)}
                className="group flex flex-col items-center gap-1 rounded-[12px] p-1 text-xs font-medium text-ink-muted hover:text-ink"
              >
                <span className={cn(`chat-wall-${w.key} relative block h-14 w-full rounded-[10px] border transition-[box-shadow,transform] group-active:scale-95`, wall === w.key ? "border-transparent ring-2 ring-accent" : "border-border")}>
                  {wall === w.key && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-primary text-white"><Check className="size-3" strokeWidth={3} /></span>
                  )}
                </span>
                {w.label}
              </button>
            ))}
          </div>
          <p className="px-1 pt-2 text-xs text-ink-subtle">Saved on this device. Only you see it.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
