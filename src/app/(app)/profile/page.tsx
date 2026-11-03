import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { ensureProfile } from "@/lib/profile";

export default async function MyProfilePage() {
  const user = await requireUser("/profile");
  const profile = user.profile ?? (await ensureProfile(user.id, user.name));
  redirect(`/u/${profile.username}`);
}
