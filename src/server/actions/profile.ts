"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ActionError, parseOrThrow, runAction, type ActionResult } from "@/lib/action";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireActionUser } from "@/lib/session";
import { changePasswordSchema, onboardingSchema, privacySchema, profileSchema } from "@/lib/validation";
import { signOut } from "@/auth";

export async function toggleFollowGoalAction(goalId: number): Promise<ActionResult<{ following: boolean }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const id = Number(goalId);
    if (!Number.isInteger(id) || id < 1 || id > 17) throw new ActionError("Invalid goal.");
    const key = { userId_goalId: { userId: user.id, goalId: id } };
    const existing = await db.userSdgInterest.findUnique({ where: key });
    if (existing) await db.userSdgInterest.delete({ where: key });
    else await db.userSdgInterest.create({ data: { userId: user.id, goalId: id } });
    revalidatePath("/sdgs");
    revalidatePath(`/sdgs/${id}`);
    return { ok: true, data: { following: !existing }, message: existing ? `Unfollowed Goal ${id}.` : `Following Goal ${id}. We'll tailor your recommendations.` };
  });
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("profile", 30, 3600, user.id);
    const d = parseOrThrow(profileSchema, input);
    const taken = await db.userProfile.findFirst({ where: { username: d.username, userId: { not: user.id } } });
    if (taken) throw new ActionError("That username is taken.", { username: "That username is taken" });
    // Only admins keep the admin role; others may switch between self-service roles.
    const role = user.role === "ADMIN" ? "ADMIN" : d.role;
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name: d.name, role, image: d.image ?? null } }),
      db.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id, username: d.username, headline: d.headline, bio: d.bio, city: d.city, country: d.country,
          latitude: d.latitude ?? null, longitude: d.longitude ?? null, website: d.website, skills: d.skills, interests: d.interests,
        },
        update: {
          username: d.username, headline: d.headline ?? null, bio: d.bio ?? null, city: d.city ?? null, country: d.country ?? null,
          latitude: d.latitude ?? null, longitude: d.longitude ?? null, website: d.website ?? null, skills: d.skills, interests: d.interests,
        },
      }),
      db.userSdgInterest.deleteMany({ where: { userId: user.id } }),
      db.userSdgInterest.createMany({ data: d.goals.map((goalId) => ({ userId: user.id, goalId })) }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true, message: "Profile saved." };
  });
}

/** First-run onboarding: role, followed goals, skills/interests, location and email preference. */
export async function completeOnboardingAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("onboarding", 20, 3600, user.id);
    const d = parseOrThrow(onboardingSchema, input);
    const role = user.role === "ADMIN" ? "ADMIN" : d.role;
    const profile = {
      skills: d.skills, interests: d.interests, city: d.city ?? null, country: d.country ?? null,
      emailNotifications: d.emailNotifications, onboardedAt: new Date(),
    };
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { role } }),
      db.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, username: user.profile?.username ?? `user_${user.id.slice(-8)}`, ...profile },
        update: profile,
      }),
      db.userSdgInterest.deleteMany({ where: { userId: user.id } }),
      db.userSdgInterest.createMany({ data: d.goals.map((goalId) => ({ userId: user.id, goalId })) }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true, message: "You're all set. Here are projects picked for you." };
  });
}

/** Lets people skip onboarding; they can fill the same details in Settings later. */
export async function skipOnboardingAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (user.profile) await db.userProfile.update({ where: { userId: user.id }, data: { onboardedAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function updatePrivacyAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const d = parseOrThrow(privacySchema, input);
    await db.userProfile.update({ where: { userId: user.id }, data: d });
    revalidatePath("/settings");
    return { ok: true, message: "Preferences saved." };
  });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await enforceRateLimit("change-password", 5, 3600, user.id);
    const d = parseOrThrow(changePasswordSchema, input);
    if (user.passwordHash) {
      if (!d.currentPassword || !(await bcrypt.compare(d.currentPassword, user.passwordHash))) {
        throw new ActionError("Your current password is incorrect.", { currentPassword: "Incorrect password" });
      }
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(d.newPassword, 12) } });
    return { ok: true, message: "Password updated." };
  });
}

/** Permanently deletes the account and personal data (GDPR-style erasure). */
export async function deleteAccountAction(confirmEmail: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (confirmEmail.trim().toLowerCase() !== user.email) throw new ActionError("Type your email address exactly to confirm.");
    if (user.role === "ADMIN" && (await db.user.count({ where: { role: "ADMIN" } })) <= 1) throw new ActionError("You're the last administrator. Promote someone else first.");
    const ledProjects = await db.project.count({ where: { organizerId: user.id } });
    const ownedOrgs = await db.organization.count({ where: { createdById: user.id } });
    const opps = await db.volunteerOpportunity.count({ where: { createdById: user.id } });
    if (ledProjects || ownedOrgs || opps) throw new ActionError("You organize projects, opportunities or organizations. Hand them over or delete them before deleting your account.");
    // Groups you created stay for their members; ownership moves to an administrator.
    const admin = await db.user.findFirst({ where: { role: "ADMIN", id: { not: user.id } }, select: { id: true } });
    if (admin) await db.discussionGroup.updateMany({ where: { createdById: user.id }, data: { createdById: admin.id } });
    await db.user.delete({ where: { id: user.id } });
    await signOut({ redirectTo: "/" });
    return { ok: true };
  });
}
