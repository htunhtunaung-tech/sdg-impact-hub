export type NavIcon =
  | "home" | "globe" | "folder" | "heart" | "chart" | "users" | "sparkles" | "settings" | "help" | "flame" | "building" | "shield" | "message";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  badge?: string;
  auth?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", auth: true },
  { href: "/sdgs", label: "Explore SDGs", icon: "globe" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/volunteer", label: "Volunteer", icon: "heart" },
  { href: "/impact", label: "Impact Analytics", icon: "chart", auth: true },
  { href: "/challenges", label: "Challenges", icon: "flame", auth: true },
  { href: "/community", label: "Community", icon: "users", auth: true },
  { href: "/organizations", label: "Organizations", icon: "building" },
  { href: "/assistant", label: "AI Assistant", icon: "sparkles", badge: "New", auth: true },
];

export const SUPPORT_NAV: NavItem[] = [
  { href: "/messages", label: "Messages", icon: "message", auth: true },
  { href: "/settings", label: "Settings", icon: "settings", auth: true },
  { href: "/help", label: "Help Center", icon: "help" },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "Admin", icon: "shield", auth: true };
