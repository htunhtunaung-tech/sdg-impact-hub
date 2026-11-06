import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { PostCard, postInclude } from "@/components/community/post-card";
import { CommentForm, DeleteCommentButton } from "./comments";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/community/post/${id}`);
  const post = await db.post.findUnique({ where: { id }, include: postInclude(user.id) });
  if (!post || (post.isHidden && user.role !== "ADMIN")) notFound();
  const comments = await db.comment.findMany({
    where: { postId: id, ...(user.role === "ADMIN" ? {} : { isHidden: false }) },
    include: { author: { select: { id: true, name: true, image: true, profile: { select: { username: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="container-page max-w-3xl py-6 sm:py-8">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline"><ArrowLeft className="size-4" /> Community</Link>
      <PostCard post={post} currentUserId={user.id} isAdmin={user.role === "ADMIN"} expanded />
      <section className="mt-6" aria-label="Comments">
        <h2 className="mb-3 text-lg font-semibold">{comments.length} {comments.length === 1 ? "comment" : "comments"}</h2>
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.author.name} src={c.author.image} size={36} />
              <div className="min-w-0 flex-1 rounded-[16px] bg-surface p-3 shadow-card">
                <p className="text-sm">
                  <Link href={c.author.profile ? `/u/${c.author.profile.username}` : "#"} className="font-semibold hover:underline">{c.author.name}</Link>
                  <span className="text-ink-subtle"> · {timeAgo(c.createdAt)}</span>
                  {c.isHidden && <span className="ml-2 text-xs text-danger">(hidden)</span>}
                </p>
                <p className="mt-1 whitespace-pre-line text-[15px] text-slate-700">{c.body}</p>
              </div>
              {(c.author.id === user.id || user.role === "ADMIN") && <DeleteCommentButton id={c.id} />}
            </li>
          ))}
        </ul>
        <CommentForm postId={id} />
      </section>
    </div>
  );
}
