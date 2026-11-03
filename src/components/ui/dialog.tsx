"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Centered dialog on desktop, bottom sheet on mobile (matches the Figma sign-up sheet). */
export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed z-50 w-full bg-surface shadow-overlay focus:outline-none data-[state=open]:animate-fade-in",
          "inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[22px] px-5 pb-8 pt-3",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)] sm:p-6",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-xl font-bold text-ink">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-ink-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="-mr-1 rounded-md p-1.5 text-ink-muted hover:bg-slate-100 hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
