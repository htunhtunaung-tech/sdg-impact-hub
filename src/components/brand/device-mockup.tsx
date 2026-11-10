import { Bell, Bike, Droplet, Leaf, Plus, Utensils } from "lucide-react";

/**
 * Decorative phone + laptop preview of the product for the landing page.
 * Built from live CSS (no screenshots) so it stays sharp, light and on-brand; hidden from
 * assistive tech because the same information is in the page copy.
 */
export function DeviceMockup() {
  return (
    <div className="relative mx-auto min-h-[440px] w-full max-w-[560px] sm:min-h-[500px]" aria-hidden>
      {/* Laptop / dashboard card */}
      <div className="float-slower ml-auto w-[84%] rounded-[24px] border border-border/80 bg-surface p-4 shadow-overlay sm:p-5">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 h-6 flex-1 rounded-full bg-track" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["bg-tone-mint", "128h", "Hours"],
            ["bg-tone-sky", "6", "Projects"],
            ["bg-tone-sun", "1.2k", "Reached"],
            ["bg-tone-lilac", "5", "Goals"],
          ].map(([bg, v, l]) => (
            <div key={l} className={`rounded-[14px] p-2.5 ${bg}`}>
              <p className="text-[15px] font-bold text-ink sm:text-lg">{v}</p>
              <p className="text-[10px] text-ink-muted sm:text-[11px]">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-[1.6fr_1fr] gap-2">
          <div className="rounded-[14px] bg-canvas p-3">
            <p className="text-[11px] font-semibold text-ink">Monthly progress</p>
            <svg viewBox="0 0 200 70" className="mt-2 h-16 w-full">
              <defs>
                <linearGradient id="mk-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 52 C 25 40, 40 46, 60 34 S 100 38, 120 24 S 165 20, 200 8 L200 70 L0 70 Z" fill="url(#mk-fill)" />
              <path d="M0 52 C 25 40, 40 46, 60 34 S 100 38, 120 24 S 165 20, 200 8" fill="none" stroke="#059669" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex items-center justify-center rounded-[14px] bg-canvas p-2">
            <svg viewBox="0 0 42 42" className="size-20">
              {[
                ["#C5192D", 0, 34], ["#3F7E44", 36, 26], ["#26BDE2", 64, 18], ["#4C9F38", 84, 14],
              ].map(([c, off, len]) => (
                <circle key={String(c)} cx="21" cy="21" r="15.9" fill="none" stroke={String(c)} strokeWidth="5" strokeDasharray={`${len} ${100 - Number(len)}`} strokeDashoffset={-Number(off) + 25} pathLength={100} strokeLinecap="round" />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="float-slow absolute left-0 top-28 w-[44%] min-w-[170px] rounded-[34px] border-[6px] border-ink bg-[image:var(--gradient-eco)] p-3 shadow-overlay">
        <div className="mx-auto mb-3 h-4 w-16 rounded-full bg-ink" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-ink">Good morning, Ploy</p>
          <span className="flex size-6 items-center justify-center rounded-full bg-white"><Bell className="size-3 text-ink-muted" /></span>
        </div>
        <div className="mt-2.5 rounded-[18px] bg-white p-3 shadow-card">
          <p className="text-[9px] text-ink-muted">Your impact this month</p>
          <p className="mt-0.5 text-2xl font-bold text-ink">42<span className="ml-1 text-[10px] font-semibold text-ink-muted">hours</span></p>
          <p className="mt-1 inline-block rounded-full bg-tone-mint px-2 py-0.5 text-[8px] font-semibold text-forest-900">18% vs last month</p>
        </div>
        <div className="mt-2.5 space-y-2 rounded-[18px] bg-white p-3 shadow-card">
          {[
            [Droplet, "Clean water", "w-[80%]", "#26BDE2"],
            [Utensils, "Food", "w-[55%]", "#DDA63A"],
            [Bike, "Transport", "w-[35%]", "#4C9F38"],
          ].map(([Icon, l, w, c]) => {
            const I = Icon as typeof Droplet;
            return (
              <div key={String(l)} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-canvas"><I className="size-2.5 text-ink-muted" /></span>
                <div className="flex-1">
                  <p className="text-[8px] font-semibold text-ink">{String(l)}</p>
                  <div className="mt-0.5 h-1 rounded-full bg-track"><div className={`h-1 rounded-full ${String(w)}`} style={{ background: String(c) }} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-around rounded-full bg-white px-2 py-1.5 shadow-card">
          <Leaf className="size-3 text-forest-900" />
          <span className="flex h-5 w-8 items-center justify-center rounded-full bg-primary"><Plus className="size-3 text-white" /></span>
          <Bell className="size-3 text-ink-subtle" />
        </div>
      </div>
    </div>
  );
}
