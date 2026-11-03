import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { CalendarDays, MapPin, Megaphone } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { formatDate, timeAgo } from "@/lib/utils";
import { PostActions } from "./post-actions";

export const postInclude = (_userId?: string) =>
  ({
    author: { select: { id: true, name: true, image: true, profile: { select: { username: true } } } },
    project: { select: { title: true, slug: true } },
    group: { select: { name: true, slug: true } },
    reactions: { select: { type: true, userId: true } },
    _count: { select: { comments: { where: { isHidden: false } } } },
  }) satisfies Prisma.PostInclude;

export type PostWithMeta = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>;

export function PostCard({ post, currentUserId, isAdmin = false, expanded = false }: { post: PostWithMeta; currentUserId?: string; isAdmin?: boolean; expanded?: boolean }) {
  const counts: Record<string, number> = {};
  for (const r of post.reactions) counts[r.type] = (counts[r.type] ?? 0) + 1;
  const mine = post.reactions.find((r) => r.userId === currentUserId)?.type ?? null;
  const profileHref = post.author.profile ? `/u/${post.author.profile.username}` : "#";
  return (
    <article className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-card sm:p-5">
      <header className="flex items-start gap-3">
        <Link href={profileHref}><Avatar name={post.author.name} src={post.author.image} size={40} /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug">
            <Link href={profileHref} className="font-semibold hover:underline">{post.author.name}</Link>
            {post.project && (
              <span className="text-ink-muted"> · <Link href={`/projects/${post.project.slug}`} className="hover:underline">{post.project.title}</Link></span>
            )}
            {post.group && (
              <span className="text-ink-muted"> in <Link href={`/community/groups/${post.group.slug}`} className="font-medium hover:underline">{post.group.name}</Link></span>
            )}
          </p>
          <p className="flex items-center gap-2 text-xs text-ink-subtle">
            <time dateTime={post.createdAt.toISOString()}>{timeAgo(post.createdAt)}</time>
            {post.goalId && <span className="inline-flex items-center gap-1"><SdgNumber goal={post.goalId} size={16} /> Goal {post.goalId}</span>}
          </p>
        </div>
        {post.type === "PROJECT_UPDATE" && <Badge variant="success"><Megaphone /> Project update</Badge>}
        {post.type === "EVENT" && <Badge variant="info"><CalendarDays /> Event</Badge>}
      </header>
      <div className="mt-3">
        {post.title && <h3 className="text-[17px] font-semibold leading-snug">{expanded ? post.title : <Link href={`/community/post/${post.id}`} className="hover:underline">{post.title}</Link>}</h3>}
        <p className={`mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-700 ${expanded ? "" : "line-clamp-5"}`}>{post.body}</p>
        {post.type === "EVENT" && post.eventStartsAt && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-[10px] bg-info-soft px-3 py-2.5 text-sm text-info">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDate(post.eventStartsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
            {post.eventLocation && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> {post.eventLocation}</span>}
          </div>
        )}
      </div>
      <PostActions
        postId={post.id}
        counts={counts}
        mine={mine}
        comments={post._count.comments}
        canDelete={post.author.id === currentUserId || isAdmin}
        signedIn={Boolean(currentUserId)}
        isOwn={post.author.id === currentUserId}
      />
    </article>
  );
}
