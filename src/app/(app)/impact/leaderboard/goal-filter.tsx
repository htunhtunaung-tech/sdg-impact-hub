"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

export function GoalFilter({ value, goals }: { value: number; goals: { id: number; title: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <Select aria-label="Filter by goal" className="w-56" value={value} onChange={(e) => {
      const p = new URLSearchParams(sp.toString());
      if (e.target.value === "0") p.delete("goal");
      else p.set("goal", e.target.value);
      router.replace(`${pathname}?${p.toString()}`);
    }}>
      <option value={0}>All goals</option>
      {goals.map((g) => <option key={g.id} value={g.id}>{g.id}. {g.title}</option>)}
    </Select>
  );
}
