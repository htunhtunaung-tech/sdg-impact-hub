import { cn } from "@/lib/utils";

/** Original decorative illustration: a globe cradled by a leaf, with orbiting goal dots. */
export function EcoIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={cn("h-auto w-full", className)} aria-hidden focusable="false">
      <defs>
        <radialGradient id="eco-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="eco-globe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="eco-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#eco-halo)" />
      <circle cx="160" cy="160" r="122" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="2 7" />
      <circle cx="160" cy="138" r="72" fill="url(#eco-globe)" />
      <path d="M118 112c14-6 24 4 36 0s14-16 30-10c10 4 8 18 18 22 6 2 10 8 8 14-14 0-22 10-34 8-14-2-12-18-28-16-10 1-16 12-28 8-8-3-10-14-6-20 2-3 2-5 4-6z" fill="#bbf7d0" opacity="0.85" />
      <path d="M126 168c10-4 22 0 26 10 3 8-4 16-14 16-12 0-20-14-12-26z" fill="#bbf7d0" opacity="0.7" />
      <path d="M178 160c8-2 18 4 18 12s-10 14-18 10-8-20 0-22z" fill="#bbf7d0" opacity="0.6" />
      <path d="M64 232c18-58 70-86 132-74 30 6 56 22 70 44-46 4-82 30-128 40-30 6-56 2-74-10z" fill="url(#eco-leaf)" />
      <path d="M78 228c44-26 96-44 172-28" fill="none" stroke="#f0fdf4" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {[
        ["#E5243B", 52, 120], ["#26BDE2", 270, 96], ["#FCC30B", 262, 240], ["#C5192D", 92, 62], ["#3F7E44", 222, 46], ["#19486A", 44, 186],
      ].map(([c, x, y]) => (
        <circle key={String(c)} cx={Number(x)} cy={Number(y)} r="9" fill={String(c)} stroke="#fff" strokeWidth="3" />
      ))}
    </svg>
  );
}
