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
    // Start after the page has finished loading and hydrating, so we never touch server HTML React is
    // still checking. Whatever is on screen by then stays as it is; only content further down waits
    // for the visitor to scroll to it.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      document.querySelectorAll<HTMLElement>(".reveal, .reveal-group > *").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.dataset.shown = "now";
      });
      scan();
      root.classList.add("reveal-on");
      mo.observe(document.body, { childList: true, subtree: true });
    };

    // Client navigations and streamed content add new elements; look for them once per frame.
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    const later = () => window.setTimeout(start, 150);
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
