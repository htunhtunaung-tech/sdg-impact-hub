import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Logo } from "@/components/layout/logo";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ again?: string }> }) {
  const user = await requireUser("/onboarding");
  if (user.profile?.onboardedAt && !(await searchParams).again) redirect("/dashboard");
  const goals = await db.userSdgInterest.findMany({ where: { userId: user.id }, select: { goalId: true } });

  return (
    <div className="min-h-dvh bg-[image:var(--gradient-eco)]">
      <header className="container-page flex h-16 items-center">
        <Logo href="/dashboard" />
      </header>
      <main id="main" className="container-page pb-16 pt-2 sm:pt-6">
        <OnboardingFlow
          firstName={user.name.split(" ")[0] ?? user.name}
          initial={{
            role: user.role === "ADMIN" ? "VOLUNTEER" : user.role,
            goals: goals.map((g) => g.goalId),
            skills: user.profile?.skills ?? [],
            interests: user.profile?.interests ?? [],
            city: user.profile?.city ?? "",
            country: user.profile?.country ?? "",
            emailNotifications: user.profile?.emailNotifications ?? true,
          }}
        />
      </main>
    </div>
  );
}
