import {
  BookOpen, Briefcase, Building2, Droplet, Factory, Fish, Handshake, HandHeart, HeartPulse, Landmark, Leaf, Recycle,
  Scale, Sun, Thermometer, Users, Wheat, type LucideProps,
} from "lucide-react";
import { sdg } from "@/lib/sdg";

const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  "hand-heart": HandHeart,
  wheat: Wheat,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  users: Users,
  droplet: Droplet,
  sun: Sun,
  briefcase: Briefcase,
  factory: Factory,
  scale: Scale,
  building: Building2,
  recycle: Recycle,
  thermometer: Thermometer,
  fish: Fish,
  leaf: Leaf,
  landmark: Landmark,
  handshake: Handshake,
};

export function SdgIcon({ goal, ...props }: { goal: number } & LucideProps) {
  const Icon = ICONS[sdg(goal).icon] ?? Leaf;
  return <Icon aria-hidden {...props} />;
}
