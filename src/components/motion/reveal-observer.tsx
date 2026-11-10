"use client";

import { useEffect } from "react";

/**
 * Scroll reveals for every page. Elements with `.reveal` (or the children of a `.reveal-group`) start hidden
 * and fade up the first time they scroll into view; items that appear together are staggered.
 * Only runs when the inline script in the root layout added `html.motion` (it doesn't for Reduce motion or
 * Save-Data). Nothing is hidden until this has run, so pages read fine before (or without) JavaScript.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("motion")) return;

    const io = new IntersectionObserver(
      (entries) => {
        let k = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty("--i", String(Math.min(k++, 8)));
          el.dataset.shown = "";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(".reveal:not([data-shown]), .reveal-group > :not([data-shown])").forEach((el) => {
        if (el.dataset.watch !== undefined) return;
        el.dataset.watch = "";
        io.observe(el);
      });
    };
    // Whatever is already on screen stays as it is (it was visible before JavaScript loaded);
    // only content further down waits for the visitor to scroll to it.
    document.querySelectorAll<HTMLElement>(".reveal, .reveal-group > *").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.dataset.shown = "now";
    });
    scan();
    root.classList.add("reveal-on");

    // Client navigations and streamed content add new elements; look for them once per frame.
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
