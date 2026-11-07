import { Logo } from "@/components/layout/logo";
import { EcoIllustration } from "@/components/brand/illustration";
import { CreatorCredit } from "@/components/layout/creator-credit";
import { SDGS, sdgForeground } from "@/lib/sdg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-[image:var(--gradient-eco)] lg:grid-cols-[1fr_minmax(0,600px)] lg:bg-none lg:bg-surface">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <header><Logo /></header>
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[440px] rounded-[var(--radius-2xl)] bg-surface p-6 shadow-raised sm:p-8 lg:p-0 lg:shadow-none">{children}</div>
        </main>
        <footer className="space-y-1 text-xs text-ink-muted"><p>© {new Date().getFullYear()} SDG Impact Hub · Built for the UN Global Goals community</p><CreatorCredit className="text-xs" /></footer>
      </div>
      <aside aria-label="About SDG Impact Hub" className="relative m-4 hidden overflow-hidden rounded-[32px] bg-[image:var(--gradient-eco)] lg:block" aria-hidden>
        <div className="relative flex h-full flex-col items-center justify-center p-12 text-center">
          <EcoIllustration className="max-w-[340px]" />
          <p className="mt-6 max-w-md text-[34px] font-bold leading-[1.1] tracking-tight text-ink">Small actions, verified and added up, change places.</p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            Join local projects, give your time where it counts, and see your contribution to the 17 Global Goals — measured honestly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-1.5">
            {SDGS.map((g) => (
              <span key={g.id} className="flex size-7 items-center justify-center rounded-[8px] text-[11px] font-bold" style={{ background: g.color, color: sdgForeground(g.color) }}>
                {g.id}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
