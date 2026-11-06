import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarDays, MessageSquare, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkTabs } from "@/components/ui/tabs";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { PostCard, postInclude } from "@/components/community/post-card";
import { Composer } from "./composer";
import { NewGroupButton } from "./new-group";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ filter?: string; goal?: string }> }) {
  const user = await requireUser("/community");
  const sp = await searchParams;
  const filter = ["following", "updates", "events"].includes(sp.filter ?? "") ? sp.filter! : "all";
  const goal = Number(sp.goal) || null;
  const followed = (await db.userSdgInterest.findMany({ where: { userId: user.id }, select: { goalId: true } })).map((f) => f.goalId);
  const where: Prisma.PostWhereInput = {
    isHidden: false,
    ...(goal ? { goalId: goal } : {}),
    ...(filter === "following" ? { OR: [{ goalId: { in: followed } }, { project: { members: { some: { userId: user.id } } } }, { group: { members: { some: { userId: user.id } } } }] } : {}),
    ...(filter === "updates" ? { type: "PROJECT_UPDATE" } : {}),
    ...(filter === "events" ? { type: "EVENT" } : {}),
  };
  const [posts, groups, myGroups, events] = await Promise.all([
    db.post.findMany({ where, include: postInclude(user.id), orderBy: { createdAt: "desc" }, take: 40 }),
    db.discussionGroup.findMany({ include: { _count: { select: { members: true, posts: true } } }, orderBy: { members: { _count: "desc" } }, take: 8 }),
    db.groupMember.findMany({ where: { userId: user.id }, include: { group: { select: { id: true, name: true } } } }),
    db.post.findMany({ where: { type: "EVENT", isHidden: false, eventStartsAt: { gt: new Date() } }, orderBy: { eventStartsAt: "asc" }, take: 4 }),
  ]);
  const q = (f: string) => `/community?filter=${f}${goal ? `&goal=${goal}` : ""}`;
  return (
    <div className="container-page py-6 sm:py-8">
      <PageHeader title="Community" description={goal ? `Conversations about Goal ${goal}.` : "Updates, questions and events from people working on the goals."} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Composer groups={myGroups.map((g) => g.group)} defaultGoal={goal} />
          <LinkTabs active={filter} tabs={[{ key: "all", label: "Everything", href: q("all") }, { key: "following", label: "Following", href: q("following") }, { key: "updates", label: "Project updates", href: q("updates") }, { key: "events", label: "Events", href: q("events") }]} />
          {goal && <p className="flex items-center gap-2 text-sm text-ink-muted"><SdgNumber goal={goal} size={20} /> Showing Goal {goal} only · <Link href={`/community?filter=${filter}`} className="font-semibold text-link hover:underline">Show all goals</Link></p>}
          {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} isAdmin={user.role === "ADMIN"} />) : (
            <EmptyState icon={<MessageSquare />} title="Nothing here yet" description={filter === "following" ? "Follow goals, join projects or groups to fill this feed." : "Start the conversation."} />
          )}
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Discussion groups</CardTitle><NewGroupButton /></CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {groups.map((g) => (
                  <li key={g.id}>
                    <Link href={`/community/groups/${g.slug}`} className="flex items-center gap-3 rounded-[14px] p-2 hover:bg-canvas">
                      {g.goalId ? <SdgNumber goal={g.goalId} size={32} /> : <span className="flex size-8 items-center justify-center rounded-md bg-mint text-link"><Users className="size-4" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{g.name}</span>
                        <span className="text-xs text-ink-muted">{g._count.members} members · {g._count.posts} posts</span>
                      </span>
                      {myGroups.some((m) => m.groupId === g.id) && <span className="text-xs font-semibold text-link">Joined</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming events</CardTitle></CardHeader>
            <CardContent>
              {events.length ? (
                <ul className="space-y-3">
                  {events.map((e) => (
                    <li key={e.id}>
                      <Link href={`/community/post/${e.id}`} className="group block">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-link"><CalendarDays className="size-3.5" />{formatDate(e.eventStartsAt!, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                        <p className="text-sm font-semibold group-hover:underline">{e.title}</p>
                        {e.eventLocation && <p className="text-xs text-ink-muted">{e.eventLocation}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-muted">No upcoming events.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 pt-5 text-sm">
              <p className="font-semibold">Community guidelines</p>
              <ul className="list-disc space-y-1 pl-5 text-ink-muted">
                <li>Be kind and assume good intent.</li>
                <li>Share real, honest results — never inflate impact.</li>
                <li>No spam or self-promotion unrelated to the goals.</li>
              </ul>
              <Link href="/impact/leaderboard" className="inline-block pt-2 font-semibold text-link hover:underline">See the volunteer leaderboard →</Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
