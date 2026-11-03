import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[14px]" />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-[14px] xl:col-span-2" />
        <Skeleton className="h-80 rounded-[14px]" />
      </div>
    </div>
  );
}
