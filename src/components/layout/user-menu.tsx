"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, ShieldCheck, User, Award } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { signOutAction } from "@/server/actions/auth";
import type { ShellUser } from "@/components/layout/app-shell";

export function UserMenu({ user }: { user: ShellUser }) {
  return (
    <Dropdown>
      <DropdownTrigger className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-track">
        <span className="sr-only">Account menu for {user.name}</span>
        <Avatar name={user.name} src={user.image} size={36} />
        <ChevronDown className="hidden size-4 text-ink-muted sm:block" aria-hidden />
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Signed in as {user.name}</DropdownLabel>
        <DropdownItem asChild>
          <Link href="/profile">
            <User /> Your profile
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/certificate">
            <Award /> My certificate
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings">
            <Settings /> Settings
          </Link>
        </DropdownItem>
        {user.role === "ADMIN" && (
          <DropdownItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Admin dashboard
            </Link>
          </DropdownItem>
        )}
        <DropdownSeparator />
        <DropdownItem onSelect={() => void signOutAction()}>
          <LogOut /> Sign out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
