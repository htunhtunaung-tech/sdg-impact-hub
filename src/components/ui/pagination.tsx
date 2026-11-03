import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: string }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const s = sp.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const btn = "inline-flex h-10 min-w-10 items-center justify-center rounded-[10px] border border-border-strong bg-surface px-3 text-sm font-semibold hover:bg-canvas";
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 ? <Link className={cn(btn, "px-4")} href={href(page - 1)}>‹ Previous</Link> : <span className={cn(btn, "px-4 opacity-40")}>‹ Previous</span>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1]! > 1 && <span className="px-1 text-ink-subtle">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, "hidden sm:inline-flex", n === page && "border-primary bg-primary text-white hover:bg-primary-hover")}>
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? <Link className={cn(btn, "px-4")} href={href(page + 1)}>Next ›</Link> : <span className={cn(btn, "px-4 opacity-40")}>Next ›</span>}
    </nav>
  );
}
