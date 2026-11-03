import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-[10px] border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle transition-colors hover:border-slate-400 focus:border-accent focus:outline-none focus:ring-3 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-red-600/15";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        base,
        "h-10 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("size-[18px] shrink-0 cursor-pointer rounded-[5px] border-border-strong accent-[var(--color-primary)]", className)}
      {...props}
    />
  );
}

export function Radio({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="radio" className={cn("size-[18px] shrink-0 cursor-pointer accent-[var(--color-primary)]", className)} {...props} />;
}
