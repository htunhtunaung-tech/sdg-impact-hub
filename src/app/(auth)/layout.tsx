import { Logo } from "@/components/layout/logo";
import { SDGS, sdgForeground } from "@/lib/sdg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
        <p className="text-xs text-ink-subtle">© {new Date().getFullYear()} SDG Impact Hub · Built for the UN Global Goals community</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-forest-900 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(5,150,105,0.45),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="grid grid-cols-6 gap-2 opacity-95">
            {SDGS.map((g) => (
              <div key={g.id} className="flex aspect-square items-end rounded-[10px] p-2 text-lg font-bold" style={{ background: g.color, color: sdgForeground(g.color) }}>
                {g.id}
              </div>
            ))}
          </div>
          <div>
            <p className="font-display text-[44px] leading-[1.05]">Small actions, <em>verified</em> and added up, change places.</p>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-emerald-100/90">
              Join local projects, give your time where it counts, and see your contribution to the 17 Global Goals — measured honestly.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
