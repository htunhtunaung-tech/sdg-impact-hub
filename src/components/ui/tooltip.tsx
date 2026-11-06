"use client";

import * as React from "react";
import { Tooltip as T } from "radix-ui";

/** Accessible tooltip: shows on hover and keyboard focus, dismissible with Escape. */
export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactElement; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            sideOffset={8}
            className="z-[70] max-w-64 rounded-[16px] bg-ink px-3 py-2 text-[13px] font-medium leading-snug text-white shadow-overlay data-[state=delayed-open]:animate-fade-in"
          >
            {content}
            <T.Arrow className="fill-ink" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
