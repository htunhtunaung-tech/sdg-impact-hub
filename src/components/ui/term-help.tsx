"use client";

import * as React from "react";
import { Popover } from "radix-ui";
import { Info } from "lucide-react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * ⓘ help for a term. Opens on hover (mouse), keyboard focus + Enter, and tap (phones have no hover);
 * closes with Escape, tapping outside or moving away. 44 px tap area on touch screens.
 * Pass `children` to make an existing element (e.g. a status chip) the trigger instead of the icon.
 */
export function TermHelp({ term, children, className, side = "top" }: { term: GlossaryKey; children?: React.ReactNode; className?: string; side?: "top" | "bottom" | "left" | "right" }) {
  const g = GLOSSARY[term];
  const [open, setOpen] = React.useState(false);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hover = (v: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(v), v ? 200 : 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={children ? `${g.term}: what does this mean?` : `What is ${g.term}?`}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full text-ink-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
          // invisible 44 px hit area on coarse pointers (WCAG 2.5.8, our phone standard)
          "after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] pointer-fine:after:hidden",
          !children && "size-5",
          className,
        )}
      >
        {children ?? <Info className="size-4" aria-hidden />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={8}
          collisionPadding={12}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[70] max-w-[min(18rem,calc(100vw-24px))] rounded-[16px] bg-ink px-3.5 py-2.5 text-[13px] font-medium leading-snug text-white shadow-overlay data-[state=open]:animate-fade-in"
        >
          {g.text}
          <Popover.Arrow className="fill-ink" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
