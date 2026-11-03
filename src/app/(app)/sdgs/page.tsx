import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SDG_CATEGORIES } from "@/lib/sdg";
import { PageHeader } from "@/components/ui/misc";
import { SdgExplorer } from "./sdg-explorer";

export const metadata: Metadata = { title: "Explore the 17 Goals" };

export default async function SdgsPage() {
  const user = await getCurrentUser();
  const [goals, followed] = await Promise.all([
    db.sDGGoal.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true, title: true, shortTitle: true, color: true, category: true, tagline: true,
        _count: { select: { projects: { where: { project: { moderationStatus: "APPROVED" } } }, followers: true } },
      },
    }),
    user ? db.userSdgInterest.findMany({ where: { userId: user.id }, select: { goalId: true } }) : Promise.resolve([]),
  ]);
  const followedIds = followed.map((f) => f.goalId);
  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader
        title="Explore the 17 Goals"
        description="Find the goals you care about and the projects working on them."
        actions={
          user ? (
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <CircleCheck className="size-4 text-link" /> Goals you follow ({followedIds.length})
            </span>
          ) : null
        }
      />
      <SdgExplorer
        goals={goals.map((g) => ({ id: g.id, title: g.title, color: g.color, category: g.category, tagline: g.tagline, projects: g._count.projects, followers: g._count.followers }))}
        followed={followedIds}
        categories={SDG_CATEGORIES}
        signedIn={Boolean(user)}
      />
      <section className="mt-8 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-emerald-200 bg-mint p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="size-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-forest-900">Not sure where to start?</h2>
          <p className="mt-1 text-[15px] text-ink-muted">Tell the AI assistant about your interests and skills, and it will suggest goals and opportunities that fit you.</p>
        </div>
        <Link
          href={user ? "/assistant?q=Which%20goals%20and%20opportunities%20suit%20my%20interests%20and%20skills%3F" : "/register"}
          className="inline-flex h-11 items-center justify-center gap-3 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {user ? "Ask the assistant" : "Join to get suggestions"} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
