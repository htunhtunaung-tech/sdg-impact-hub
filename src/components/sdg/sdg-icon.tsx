import {
  BookOpen, Bird, Boxes, Building2, ChartColumnIncreasing, Earth, Equal, Fish, GlassWater, Handshake, HeartPulse,
  Infinity as InfinityIcon, Leaf, Soup, Sun, TreeDeciduous, Users, VenusAndMars, type LucideProps,
} from "lucide-react";

/** One pictogram per goal, chosen to echo the idea of each official SDG icon. */
const ICONS: Record<number, React.ComponentType<LucideProps>> = {
  1: Users,
  2: Soup,
  3: HeartPulse,
  4: BookOpen,
  5: VenusAndMars,
  6: GlassWater,
  7: Sun,
  8: ChartColumnIncreasing,
  9: Boxes,
  10: Equal,
  11: Building2,
  12: InfinityIcon,
  13: Earth,
  14: Fish,
  15: TreeDeciduous,
  16: Bird,
  17: Handshake,
};

export function SdgIcon({ goal, ...props }: { goal: number } & LucideProps) {
  const Icon = ICONS[goal] ?? Leaf;
  return <Icon aria-hidden {...props} />;
}
