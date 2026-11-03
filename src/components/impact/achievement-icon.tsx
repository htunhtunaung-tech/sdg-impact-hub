import { BadgeCheck, Clock, Flame, FolderOpen, Globe, Trophy, Users, type LucideProps } from "lucide-react";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  "badge-check": BadgeCheck, clock: Clock, trophy: Trophy, folder: FolderOpen, users: Users, globe: Globe, flame: Flame,
};

export function AchievementIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const I = MAP[icon] ?? Trophy;
  return <I aria-hidden {...props} />;
}
