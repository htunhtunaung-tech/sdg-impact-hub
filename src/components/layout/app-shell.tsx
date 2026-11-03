"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Building2, ChartColumn, ChevronRight, CircleHelp, Flame, FolderOpen, Globe, Heart, House, Menu, MessageSquare,
  Settings, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { Dialog as D } from "radix-ui";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { Logo } from "@/components/layout/logo";
import { ADMIN_NAV, MAIN_NAV, SUPPORT_NAV, type NavIcon, type NavItem } from "@/components/layout/nav-items";
import { CommandSearch } from "@/components/layout/command-search";
import { UserMenu } from "@/components/layout/user-menu";

const ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
  home: House, globe: Globe, folder: FolderOpen, heart: Heart, chart: ChartColumn, users: Users, sparkles: Sparkles,
  settings: Settings, help: CircleHelp, flame: Flame, building: Building2, shield: ShieldCheck, message: MessageSquare,
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

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const Icon = ICONS[item.icon];
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
        active ? "bg-mint font-semibold text-forest-900" : "text-slate-700 hover:bg-slate-100 hover:text-ink",
      )}
    >
      {active && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" aria-hidden />}
      <Icon className={cn("size-[18px]", active ? "text-forest-900" : "text-slate-500 group-hover:text-slate-700")} />
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="rounded-full bg-mint-strong px-2 py-0.5 text-[11px] font-semibold text-forest-900">{item.badge}</span>}
    </Link>
  );
}

function SidebarNav({ user, pathname, onNavigate }: { user: ShellUser | null; pathname: string; onNavigate?: () => void }) {
  const main = MAIN_NAV.filter((i) => !i.auth || user);
  const support = SUPPORT_NAV.filter((i) => !i.auth || user);
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto px-3">
      <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Menu</p>
      <div className="space-y-0.5">
        {main.map((i) => (
          <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mx-3 my-4 h-px bg-border" />
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Support</p>
      <div className="space-y-0.5">
        {support.map((i) => (
          <NavLink key={i.href} item={i} pathname={pathname} onNavigate={onNavigate} />
        ))}
        {user?.role === "ADMIN" && <NavLink item={ADMIN_NAV} pathname={pathname} onNavigate={onNavigate} />}
      </div>
    </nav>
  );
}

function ProfileCard({ user }: { user: ShellUser }) {
  return (
    <Link
      href="/profile"
      className="m-3 flex items-center gap-3 rounded-[12px] border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-canvas"
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
  { href: "/sdgs", label: "Explore", icon: "globe" },
  { href: "/projects", label: "Projects", icon: "folder" },
  { href: "/volunteer", label: "Volunteer", icon: "heart" },
];

export function AppShell({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo />
        </div>
        <div className="pt-2" />
        <SidebarNav user={user} pathname={pathname} />
        {user && <ProfileCard user={user} />}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden max-w-[440px] flex-1 lg:block">
            <CommandSearch />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="lg:hidden">
              <CommandSearch iconOnly />
            </div>
            {user ? (
              <>
                <Link
                  href="/messages"
                  className="relative hidden size-10 items-center justify-center rounded-[10px] border border-border text-ink-muted hover:bg-canvas hover:text-ink sm:inline-flex"
                  aria-label={`Messages${user.unreadMessages ? `, ${user.unreadMessages} unread` : ""}`}
                >
                  <MessageSquare className="size-[18px]" />
                  {user.unreadMessages > 0 && <CountDot n={user.unreadMessages} />}
                </Link>
                <Link
                  href="/notifications"
                  className="relative inline-flex size-10 items-center justify-center rounded-[10px] border border-border text-ink-muted hover:bg-canvas hover:text-ink"
                  aria-label={`Notifications${user.unreadNotifications ? `, ${user.unreadNotifications} unread` : ""}`}
                >
                  <Bell className="size-[18px]" />
                  {user.unreadNotifications > 0 && <CountDot n={user.unreadNotifications} />}
                </Link>
                <UserMenu user={user} />
              </>
            ) : (
              <>
                <Link href="/login" className="hidden h-9 items-center rounded-[10px] px-3 text-sm font-semibold text-ink hover:bg-slate-100 sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/register" className="inline-flex h-9 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="pb-28 lg:pb-12">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE_TABS.map((t) => {
            const Icon = ICONS[t.icon];
            const href = t.href === "/dashboard" && !user ? "/" : t.href;
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link href={href} aria-current={active ? "page" : undefined} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium">
                  <span className={cn("flex h-7 w-14 items-center justify-center rounded-full transition-colors", active ? "bg-mint-strong text-forest-900" : "text-slate-500")}>
                    <Icon className="size-5" />
                  </span>
                  <span className={active ? "font-semibold text-forest-900" : "text-slate-600"}>{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <D.Root open={menuOpen} onOpenChange={setMenuOpen}>
              <D.Trigger className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-600">
                <span className="flex h-7 w-14 items-center justify-center rounded-full">
                  <Menu className="size-5 text-slate-500" />
                </span>
                More
              </D.Trigger>
              <D.Portal>
                <D.Overlay className="fixed inset-0 z-40 bg-slate-900/40 data-[state=open]:animate-fade-in" />
                <D.Content className="fixed inset-y-0 right-0 z-50 flex w-[300px] max-w-[85vw] flex-col bg-surface pt-4 shadow-overlay data-[state=open]:animate-fade-in">
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
    <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-surface bg-danger px-1 text-[10px] font-bold text-white" aria-hidden>
      {n > 9 ? "9+" : n}
    </span>
  );
}
