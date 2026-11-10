/** Client-safe SDG metadata: official colours, short names and the "5 Ps" grouping. */
export type SdgCategory = "PEOPLE" | "PLANET" | "PROSPERITY" | "PEACE" | "PARTNERSHIP";

export interface SdgMeta {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  color: string;
  category: SdgCategory;
  icon: string; // lucide icon key, see components/sdg/sdg-icon.tsx
}

export const SDGS: SdgMeta[] = [
  { id: 1, slug: "no-poverty", title: "No Poverty", shortTitle: "No Poverty", color: "#E5243B", category: "PEOPLE", icon: "hand-heart" },
  { id: 2, slug: "zero-hunger", title: "Zero Hunger", shortTitle: "Zero Hunger", color: "#DDA63A", category: "PEOPLE", icon: "wheat" },
  { id: 3, slug: "good-health-and-well-being", title: "Good Health and Well-being", shortTitle: "Good Health", color: "#4C9F38", category: "PEOPLE", icon: "heart-pulse" },
  { id: 4, slug: "quality-education", title: "Quality Education", shortTitle: "Quality Education", color: "#C5192D", category: "PEOPLE", icon: "book-open" },
  { id: 5, slug: "gender-equality", title: "Gender Equality", shortTitle: "Gender Equality", color: "#FF3A21", category: "PEOPLE", icon: "users" },
  { id: 6, slug: "clean-water-and-sanitation", title: "Clean Water and Sanitation", shortTitle: "Clean Water", color: "#26BDE2", category: "PLANET", icon: "droplet" },
  { id: 7, slug: "affordable-and-clean-energy", title: "Affordable and Clean Energy", shortTitle: "Clean Energy", color: "#FCC30B", category: "PROSPERITY", icon: "sun" },
  { id: 8, slug: "decent-work-and-economic-growth", title: "Decent Work and Economic Growth", shortTitle: "Decent Work", color: "#A21942", category: "PROSPERITY", icon: "briefcase" },
  { id: 9, slug: "industry-innovation-and-infrastructure", title: "Industry, Innovation and Infrastructure", shortTitle: "Innovation", color: "#FD6925", category: "PROSPERITY", icon: "factory" },
  { id: 10, slug: "reduced-inequalities", title: "Reduced Inequalities", shortTitle: "Reduced Inequalities", color: "#DD1367", category: "PROSPERITY", icon: "scale" },
  { id: 11, slug: "sustainable-cities-and-communities", title: "Sustainable Cities and Communities", shortTitle: "Sustainable Cities", color: "#FD9D24", category: "PROSPERITY", icon: "building" },
  { id: 12, slug: "responsible-consumption-and-production", title: "Responsible Consumption and Production", shortTitle: "Responsible Consumption", color: "#BF8B2E", category: "PLANET", icon: "recycle" },
  { id: 13, slug: "climate-action", title: "Climate Action", shortTitle: "Climate Action", color: "#3F7E44", category: "PLANET", icon: "thermometer" },
  { id: 14, slug: "life-below-water", title: "Life Below Water", shortTitle: "Life Below Water", color: "#0A97D9", category: "PLANET", icon: "fish" },
  { id: 15, slug: "life-on-land", title: "Life on Land", shortTitle: "Life on Land", color: "#56C02B", category: "PLANET", icon: "leaf" },
  { id: 16, slug: "peace-justice-and-strong-institutions", title: "Peace, Justice and Strong Institutions", shortTitle: "Peace & Justice", color: "#00689D", category: "PEACE", icon: "landmark" },
  { id: 17, slug: "partnerships-for-the-goals", title: "Partnerships for the Goals", shortTitle: "Partnerships", color: "#19486A", category: "PARTNERSHIP", icon: "handshake" },
];

export const SDG_BY_ID: Record<number, SdgMeta> = Object.fromEntries(SDGS.map((g) => [g.id, g]));

export const SDG_CATEGORIES: { key: SdgCategory; label: string }[] = [
  { key: "PEOPLE", label: "People" },
  { key: "PLANET", label: "Planet" },
  { key: "PROSPERITY", label: "Prosperity" },
  { key: "PEACE", label: "Peace" },
  { key: "PARTNERSHIP", label: "Partnership" },
];

export function sdg(id: number): SdgMeta {
  return SDG_BY_ID[id] ?? SDGS[0]!;
}

function luminance(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/**
 * Foreground for text on an SDG colour: whichever of white or slate-900 contrasts more.
 * Across all 17 official colours this yields at least 4.5:1, so it is safe for small text
 * (goal numbers in 20 px tiles, "GOAL" overlines), not just large numerals.
 */
export function sdgForeground(hex: string) {
  const L = luminance(hex);
  const white = 1.05 / (L + 0.05);
  const ink = (L + 0.05) / (luminance("#0F172A") + 0.05);
  return white >= ink ? "#FFFFFF" : "#0F172A";
}

/** Soft tint used for project hero placeholders. */
export function sdgTint(hex: string, alpha = 0.16) {
  // Mixed with the page surface, so the tint is light in light mode and dark in dark mode.
  return `color-mix(in srgb, ${hex} ${Math.round(alpha * 100)}%, var(--color-surface))`;
}
