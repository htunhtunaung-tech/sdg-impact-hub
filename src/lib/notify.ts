import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { emails } from "@/lib/email";

export async function notify(
  userId: string,
  n: { type: NotificationType; title: string; body: string; link?: string },
  opts: { email?: boolean } = {},
) {
  await db.notification.create({ data: { userId, ...n } });
  if (opts.email) {
    const user = await db.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (user && user.profile?.emailNotifications !== false) {
      await emails.notification(user.email, n.title, n.body, n.link);
    }
  }
}
