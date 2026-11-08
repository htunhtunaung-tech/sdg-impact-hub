"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Number that counts up from 0 the first time it scrolls into view.
 * Server-renders the final value (good for SEO and no-JS), and stays static with reduced motion.
 */
export function CountUp({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  useEffect(() => {
    const el = ref.current;
    // Static number for reduced motion and for Save-Data (light-data mode on prepaid mobile plans)
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!el || value <= 0 || saveData || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    setShown(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden>{fmt(shown)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  );
}
