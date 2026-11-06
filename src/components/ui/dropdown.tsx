"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({ className, align = "end", ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={8}
        className={cn("z-50 min-w-52 rounded-[16px] border border-border bg-surface p-1.5 shadow-overlay data-[state=open]:animate-fade-in", className)}
        {...props}
      />
    </M.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm text-ink outline-none data-[highlighted]:bg-mint [&_svg]:size-4 [&_svg]:text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
export const DropdownLabel = ({ children }: { children: React.ReactNode }) => (
  <M.Label className="px-2.5 py-1.5 text-xs font-medium text-ink-subtle">{children}</M.Label>
);
