import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SdgLabel } from "@/components/sdg/sdg-badge";
import { PostCard, postInclude } from "@/components/community/post-card";
import { Composer } from "../../composer";
import { JoinGroupButton } from "./join-button";

export const metadata: Metadata = { title: "Group" };

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/community/groups/${slug}`);
  const group = await db.discussionGroup.findUnique({
    where: { slug },
    include: { members: { include: { user: { select: { id: true, name: true, image: true, profile: { select: { username: true } } } } }, take: 24, orderBy: { createdAt: "asc" } }, _count: { select: { members: true } } },
  });
  if (!group) notFound();
  const isMember = await db.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: user.id } } });
  const posts = await db.post.findMany({ where: { groupId: group.id, isHidden: false }, include: postInclude(user.id), orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <div className="container-page py-6 sm:py-8">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline"><ArrowLeft className="size-4" /> Community</Link>
      <div className="mb-6 flex flex-col gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          {group.goalId && <SdgLabel goal={group.goalId} short={false} link />}
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{group.name}</h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{group.description}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted"><Users className="size-4" /> {group._count.members} members</p>
        </div>
        <JoinGroupButton groupId={group.id} isMember={Boolean(isMember)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {isMember && <Composer groups={[]} groupId={group.id} defaultGoal={group.goalId} />}
          {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} currentUserId={user.id} isAdmin={user.role === "ADMIN"} />) : <EmptyState title="No posts yet" description={isMember ? "Start the first conversation." : "Join the group to post."} />}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {group.members.map((m) => (
                <li key={m.userId}><Link href={m.user.profile ? `/u/${m.user.profile.username}` : "#"} title={m.user.name}><Avatar name={m.user.name} src={m.user.image} size={36} /></Link></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
