import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
      <Logo />
      <span className="mt-10 flex size-14 items-center justify-center rounded-full bg-mint text-link"><Compass className="size-7" /></span>
      <h1 className="mt-5 text-[40px] font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-ink-muted">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">Home</Link>
        <Link href="/sdgs" className="inline-flex h-10 items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold hover:bg-canvas">Explore the goals</Link>
      </div>
    </div>
  );
}
