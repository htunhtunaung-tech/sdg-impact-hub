"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "theme";
const EVENT = "themechange";

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "light"; // Light is the default look; dark only when chosen
}

/** Adds or removes html.dark, with a short colour transition so the switch feels smooth. */
function apply(mode: ThemeMode, animate: boolean) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && systemDark());
  if (animate && !root.hasAttribute("data-calm")) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 350);
  }
  root.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a110e" : "#14532d");
}

export function setMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  apply(mode, true);
  window.dispatchEvent(new Event(EVENT));
}

/** Current choice plus whether the page is dark right now; follows system changes in "system" mode. */
export function useTheme() {
  const [mode, setState] = useState<ThemeMode>("light");
  const [isDark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => {
      setState(readMode());
      setDark(document.documentElement.classList.contains("dark"));
    };
    sync();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readMode() === "system") apply("system", true);
      sync();
    };
    mq.addEventListener("change", onSystem);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", onSystem);
    return () => {
      mq.removeEventListener("change", onSystem);
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onSystem);
    };
  }, []);
  return { mode, isDark, setMode };
}
