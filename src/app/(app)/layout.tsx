import { AppShell, type ShellUser } from "@/components/layout/app-shell";
import { db } from "@/lib/db";
import { levelForXp } from "@/lib/gamification";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  let shellUser: ShellUser | null = null;
  if (user) {
    const [unreadNotifications, unreadMessages] = await Promise.all([
      db.notification.count({ where: { userId: user.id, readAt: null } }),
      db.message.count({ where: { recipientId: user.id, readAt: null } }),
    ]);
    shellUser = {
      name: user.name,
      image: user.image,
      role: user.role,
      username: user.profile?.username ?? null,
      level: levelForXp(user.xp),
      unreadNotifications,
      unreadMessages,
    };
  }
  return <AppShell user={shellUser}>{children}</AppShell>;
}
