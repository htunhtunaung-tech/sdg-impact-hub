"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/misc";

/**
 * Code-split chart entry points. Recharts is ~100 kB, so pages load it after first paint.
 * Placeholders reserve the final height to avoid layout shift (CLS).
 */
export const HoursAreaChart = dynamic(() => import("./hours-chart").then((m) => m.HoursAreaChart), {
  ssr: false,
  loading: () => <Skeleton className="mt-8 h-[250px] w-full rounded-[16px]" />,
});

export const HoursBarChart = dynamic(() => import("./hours-chart").then((m) => m.HoursBarChart), {
  ssr: false,
  loading: () => <Skeleton className="mt-8 h-[240px] w-full rounded-[16px]" />,
});

export const DonutChart = dynamic(() => import("./donut-chart").then((m) => m.DonutChart), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center gap-5">
      <Skeleton className="size-[180px] rounded-full" />
      <Skeleton className="h-28 w-full rounded-[16px]" />
    </div>
  ),
});
