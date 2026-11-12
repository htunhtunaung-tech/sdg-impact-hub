import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const nf = new Intl.NumberFormat("en-US");
export function formatNumber(n: number, maxFractionDigits = 1) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFractionDigits }).format(n);
}
export const formatInt = (n: number) => nf.format(Math.round(n));

export function formatCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

/** Display timezone for event times (the demo community is in Thailand). */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Bangkok";

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, ...opts }).format(new Date(d));
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: APP_TIMEZONE }).format(new Date(d));
}

export function formatTimeRange(a: Date | string, b: Date | string) {
  return `${formatTime(a)}–${formatTime(b)}`;
}

export function timeAgo(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d, { day: "numeric", month: "short" });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(len = 5) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${formatInt(n)} ${n === 1 ? one : many}`;
}

export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

/** "12 Oct 2026" for one day, "1 Jan – 30 Jun 2026" (or across years) for a multi-day activity. */
export function formatDateRange(start: Date, end?: Date | null) {
  if (!end || end.getTime() === start.getTime()) return formatDate(start);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${formatDate(start, sameYear ? { day: "numeric", month: "short" } : undefined)} – ${formatDate(end)}`;
}
