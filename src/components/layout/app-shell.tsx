"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Building2, ChartColumn, ChevronRight, CircleHelp, Flame, FolderOpen, Globe, Heart, House, Menu, MessageSquare,
  Plus, Settings, ShieldCheck, Sparkles, Users, UserSearch } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { Logo } from "@/components/layout/logo";
import { ADMIN_NAV, MAIN_NAV, SUPPORT_NAV, type NavIcon, type NavItem } from "@/components/layout/nav-items";
import { CommandSearch } from "@/components/layout/command-search";
import { UserMenu } from "@/components/layout/user-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { CreatorCredit } from "@/components/layout/creator-credit";

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  home: House, globe: Globe, folder: FolderOpen, heart: Heart, chart: ChartColumn, users: Users, sparkles: Sparkles,
  settings: Settings, help: CircleHelp, flame: Flame, building: Building2, shield: ShieldCheck, message: MessageSquare, people: UserSearch,
};

export interface ShellUser {
  name: string;
  image: string | null;
  role: string;
  username: string | null;
  level: number;
  unreadNotifications: number;
  unreadMessages: number;
}

const roleLabel: Record<string, string> = {
  INDIVIDUAL: "Member", STUDENT: "Student", VOLUNTEER: "Volunteer", ORGANIZER: "Project organizer", ORGANIZATION: "Organization", ADMIN: "Administrator",
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

/** Each menu item wears one of the official SDG colours (icon chip, active bar and soft highlight). */
const NAV_COLORS: Record<NavIcon, string> = {
  home: "#4C9F38", globe: "#0A97D9", folder: "#FD6925", heart: "#E5243B", chart: "#A21942", flame: "#FF3A21",
  users: "#26BDE2", people: "#DD1367", building: "#19486A", sparkles: "#FD9D24", message: "#00689D",
  settings: "#3F7E44", help: "#BF8B2E", shield: "#14532d",
};

function NavLink({ item, pathname, onNavigate, compact = false }: { item: NavItem; pathname: string; onNavigate?: () => void; compact?: boolean }) {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item.href);
  const color = { "--nav-c": NAV_COLORS[item.icon] } as React.CSSProperties;
  if (compact)
    return (
      <Tooltip content={item.label} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          aria-label={item.label}
          style={color}
          className={cn("nav-item group relative mx-auto flex size-12 items-center justify-center rounded-[16px] transition-[background-color,color,transform] active:scale-95", active && "is-active")}
        >
          <Icon className="nav-icon size-5" />
          {item.badge && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden />}
        </Link>
      </Tooltip>
    );
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      style={color}
      className={cn("nav-item group relative flex h-11 items-center gap-3 rounded-[14px] px-3 text-[15px] transition-[background-color,color,transform] active:scale-[0.98]", active && "is-active font-semibold")}
    >
      <span className="nav-chip flex size-8 items-center justify-center rounded-[11px] transition-[background-color,color,transform] duration-200">
        <Icon className="nav-icon size-[18px]" />
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="rounded-full bg-mint-strong px-2 py-0.5 text-[11px] font-semibold text-forest-900">{item.badge}</span>}
    </Link>
  );
}

function SidebarNav({ user, pathname, onNavigate, compact = false }: { user: ShellUser | null; pathname: string; onNavigate?: () => void; compact?: boolean }) {
  const main = MAIN_NAV.filter((i) => !i.auth || user);
  const support = SUPPORT_NAV.filter((i) => !i.auth || user);
  const label = "px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle";
  return (
    <nav aria-label={compact ? "Main (compact)" : "Main"} className={cn("flex flex-1 flex-col overflow-y-auto", compact ? "items-stretch gap-1.5 px-2" : "px-3")}>
      {!compact && <p className={cn(label, "pt-1")}>Menu</p>}
      <div className={compact ? "space-y-1.5" : "space-y-1"}>
        {main.map((i) => (
          <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} compact={compact} />
        ))}
      </div>
      <div className={cn("my-4 h-px bg-border", compact ? "mx-3" : "mx-3")} />
      {!compact && <p className={label}>Support</p>}
      <div className={compact ? "space-y-1.5" : "space-y-1"}>
        {support.map((i) => (
          <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} compact={compact} />
        ))}
        {user?.role === "ADMIN" && <NavLink item={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} compact={compact} />}
      </div>
    </nav>
  );
}

/** TaskFlow-style promo card at the foot of the sidebar — here it nudges the core loop. */
function ImpactPromo() {
  return (
    <div className="relative mx-3 mt-3 overflow-hidden rounded-[20px] bg-[image:var(--gradient-brand)] p-4 text-white [@media(max-height:860px)]:hidden">
      <span className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10" aria-hidden />
      <span className="absolute -bottom-8 right-6 size-16 rounded-full bg-white/10" aria-hidden />
      <p className="relative text-[15px] font-bold">Did something good?</p>
      <p className="relative mt-1 text-[13px] leading-snug text-emerald-50">Log your hours and get them verified.</p>
      <Link href="/impact/new" className="relative mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-forest-900 hover:bg-mint">
        <Plus className="size-4" /> Record Your Impact
      </Link>
    </div>
  );
}

function ProfileCard({ user }: { user: ShellUser }) {
  return (
    <Link
      href="/profile"
      className="m-3 flex items-center gap-3 rounded-[16px] bg-canvas p-3 transition-colors hover:bg-track"
    >
      <Avatar name={user.name} src={user.image} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
        <span className="block truncate text-xs text-ink-muted">
          {roleLabel[user.role] ?? "Member"} · Level {user.level}
        </span>
      </span>
      <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
    </Link>
  );
}

const MOBILE_TABS: { href: string; label: string; icon: NavIcon }[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/volunteer", label: "Volunteer", icon: "heart" },
];

export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const tab = (t: (typeof MOBILE_TABS)[number]) => {
    const Icon = ICONS[t.icon];
    const href = t.href === "/dashboard" && !user ? "/" : t.href;
    const active = isActive(pathname, t.href);
    return (
      <li key={t.href}>
        <Link href={href} aria-current={active ? "page" : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium">
          <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition-colors", active ? "bg-tone-mint text-forest-900" : "text-slate-500")}>
            <Icon className="size-5" />
          </span>
          <span className={active ? "font-semibold text-forest-900" : "text-slate-600"}>{t.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-dvh md:pl-[104px] lg:pl-[288px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised">
        Skip to content
      </a>

      {/* Desktop: floating sidebar card */}
      <aside aria-label="Sidebar" className="fixed bottom-4 left-4 top-4 z-30 hidden w-[256px] flex-col overflow-hidden isolate rounded-[var(--radius-xl)] border border-border/80 bg-surface shadow-card lg:flex">
        <div className="flex h-[72px] items-center px-6">
          <Logo />
        </div>
        <div className="sdg-stripe mx-6 -mt-2 mb-3 h-1 rounded-full" aria-hidden />
        <div className="sidebar-doodles pointer-events-none absolute -z-10 inset-x-0 bottom-0 h-72 rounded-b-[var(--radius-xl)]" aria-hidden />
        <SidebarNav user={user} pathname={pathname} />
        {user && <ImpactPromo />}
        {user && <ProfileCard user={user} />}
      </aside>

      {/* Tablet: icon rail with tooltips */}
      <aside aria-label="Compact sidebar" className="fixed bottom-4 left-4 top-4 z-30 hidden w-[80px] flex-col items-stretch rounded-[var(--radius-xl)] border border-border/80 bg-surface py-4 shadow-card md:flex lg:hidden">
        <div className="mb-4 flex justify-center">
          <Logo iconOnly />
        </div>
        <SidebarNav user={user} pathname={pathname} compact />
        {user && (
          <div className="mt-3 flex justify-center">
            <Tooltip content="Record Your Impact" side="right">
              <Link href="/impact/new" aria-label="Record Your Impact" className="flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-brand hover:bg-primary-hover">
                <Plus className="size-5" />
              </Link>
            </Tooltip>
          </div>
        )}
      </aside>

      {/* Top bar (floating on tablet/desktop) */}
      <header className="sticky top-0 z-20 md:bg-canvas md:px-6 md:pt-4 lg:pl-4 lg:pr-8">
        <div className="flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:px-6 md:h-16 md:rounded-[var(--radius-lg)] md:border md:border-border/80 md:px-4 md:shadow-card">
          <div className="md:hidden">
            <Logo compact />
          </div>
          <div className="hidden max-w-[460px] flex-1 md:block">
            <CommandSearch />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="md:hidden">
              <CommandSearch iconOnly />
            </div>
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  href="/messages"
                  className="relative hidden size-10 items-center justify-center rounded-full bg-track text-ink-muted hover:bg-mint hover:text-ink sm:inline-flex"
                  aria-label={`Messages${user.unreadMessages ? `, ${user.unreadMessages} unread` : ""}`}
                >
                  <MessageSquare className="size-[18px]" />
                  {user.unreadMessages > 0 && <CountDot n={user.unreadMessages} />}
                </Link>
                <Link
                  href="/notifications"
                  className="relative inline-flex size-10 items-center justify-center rounded-full bg-track text-ink-muted hover:bg-mint hover:text-ink"
                  aria-label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ""}`}
                >
                  <Bell className="size-[18px]" />
                  {user.unreadNotifications > 0 && <CountDot n={user.unreadNotifications} />}
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Link href="/login" className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-ink hover:bg-track sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/register" className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-brand hover:bg-primary-hover">
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="pb-32 md:pb-12 lg:pl-0">
        {children}
        <footer className="container-page mt-4 border-t border-border pt-5">
          <CreatorCredit />
        </footer>
      </main>

      {/* Mobile: floating bottom bar with a central "Record impact" action */}
      <nav aria-label="Primary" className="fixed inset-x-3 bottom-3 z-30 rounded-[24px] border border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-raised backdrop-blur md:hidden">
        <ul className="grid grid-cols-5 items-center">
          {tab(MOBILE_TABS[0]!)}
          {tab(MOBILE_TABS[1]!)}
          <li className="flex justify-center">
            <Link
              href={user ? "/impact/new" : "/register"}
              aria-label={user ? "Record Your Impact" : "Join SDG Impact Hub"}
              className="flex h-12 w-16 items-center justify-center rounded-full bg-primary text-white shadow-brand transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </Link>
          </li>
          {tab(MOBILE_TABS[2]!)}
          <li>
            <D.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <D.Trigger className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-600">
                <span className="flex h-8 w-12 items-center justify-center rounded-full">
                  <Menu className="size-5 text-slate-500" />
                </span>
                More
              </D.Trigger>
              <D.Portal>
                <D.Overlay className="fixed inset-0 z-40 bg-slate-900/40 data-[state=open]:animate-fade-in" />
                <D.Content className="fixed inset-y-3 right-3 z-50 flex w-[300px] max-w-[85vw] flex-col rounded-[var(--radius-xl)] bg-surface pt-4 shadow-overlay data-[state=open]:animate-fade-in">
                  <D.Title className="px-6 pb-4">
                    <Logo />
                  </D.Title>
                  <D.Description className="sr-only">Site navigation</D.Description>
                  <SidebarNav user={user} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                  {user && <ProfileCard user={user} />}
                </D.Content>
              </D.Portal>
            </D.Root>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function CountDot({ n }: { n: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-bold text-white" aria-hidden>
      {n > 9 ? "9+" : n}
    </span>
  );
}
