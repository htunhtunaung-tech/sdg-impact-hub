import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Design system",
  description: "Tokens, components and states used across SDG Impact Hub.",
};

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <span className="rounded-full bg-tone-mint px-3 py-1 text-xs font-semibold text-forest-900">Design system v2</span>
        </div>
      </header>
      <main id="main" className="container-page py-10">
        <h1 className="text-[34px] font-bold tracking-tight">Design system</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Every token and component used in SDG Impact Hub, with its states. Components meet WCAG 2.2 AA: 4.5:1 text contrast, visible focus, 44&nbsp;px touch targets and
          status that never relies on colour alone.
        </p>
        <Showcase />
      </main>
    </div>
  );
}
