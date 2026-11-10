import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ensureProfile } from "@/lib/profile";
import { PageHeader } from "@/components/ui/misc";
import { SettingsForms } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const profile = user.profile ?? (await ensureProfile(user.id, user.name));
  const goals = await db.userSdgInterest.findMany({ where: { userId: user.id }, select: { goalId: true } });
  const google = await db.account.count({ where: { userId: user.id, provider: "google" } });
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <PageHeader title="Settings" description="Manage your profile, privacy and account." />
      <SettingsForms
        email={user.email}
        hasPassword={Boolean(user.passwordHash)}
        googleLinked={google > 0}
        isAdmin={user.role === "ADMIN"}
        profile={{
          name: user.name, username: profile.username, role: user.role === "ADMIN" ? "INDIVIDUAL" : user.role, image: user.image, coverImage: profile.coverImage ?? null, headline: profile.headline ?? "",
          bio: profile.bio ?? "", city: profile.city ?? "", country: profile.country ?? "", latitude: profile.latitude, longitude: profile.longitude,
          website: profile.website ?? "", skills: profile.skills, interests: profile.interests, goals: goals.map((g) => g.goalId),
        }}
        privacy={{ isPublic: profile.isPublic, showOnLeaderboard: profile.showOnLeaderboard, emailNotifications: profile.emailNotifications }}
      />
    </div>
  );
}
