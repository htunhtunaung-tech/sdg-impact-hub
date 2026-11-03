"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => router.replace(`${path}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`), 300);
    return () => clearTimeout(t);
  }, [q, path, router, sp]);
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  );
}
