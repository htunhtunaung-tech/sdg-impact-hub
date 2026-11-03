"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger"><TriangleAlert className="size-7" /></span>
      <h1 className="mt-5 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-ink-muted">We couldn&apos;t load this page. It&apos;s probably temporary — please try again.{error.digest && <span className="block text-xs text-ink-subtle">Reference: {error.digest}</span>}</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" asChild><Link href="/dashboard">Go to dashboard</Link></Button>
      </div>
    </div>
  );
}
