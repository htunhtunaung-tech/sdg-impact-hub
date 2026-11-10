import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatInt } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { FollowButton } from "@/components/social/follow-button";

type Props = { params: Promise<{ username: string; list: string }> };
const LISTS = { followers: "Followers", following: "Following" } as const;
type ListKey = keyof typeof LISTS;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, list } = await params;
  return { title: `${LISTS[list as ListKey] ?? "People"} · @${username}` };
}

/** Followers / following lists for a profile, each row with its own follow button. */
export default async function FollowListPage({ params }: Props) {
  const { username, list } = await params;
  if (!(list in LISTS)) notFound();
  const key = list as ListKey;
  const viewer = await getCurrentUser();
  const profile = await db.userProfile.findUnique({ where: { username: username.toLowerCase() }, include: { user: { select: { id: true, name: true, status: true } } } });
  if (!profile || profile.user.status !== "ACTIVE") notFound();
  const owner = profile.user;
  const canSee = profile.isPublic || viewer?.id === owner.id || viewer?.role === "ADMIN";

  const [followers, following] = await Promise.all([
    db.userFollow.count({ where: { followingId: owner.id, follower: { status: "ACTIVE" } } }),
    db.userFollow.count({ where: { followerId: owner.id, following: { status: "ACTIVE" } } }),
  ]);

  const rows = canSee
    ? await db.userFollow.findMany({
        where: key === "followers" ? { followingId: owner.id, follower: { status: "ACTIVE" } } : { followerId: owner.id, following: { status: "ACTIVE" } },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          [key === "followers" ? "follower" : "following"]: { select: { id: true, name: true, image: true, profile: { select: { username: true, headline: true, isPublic: true } } } },
        },
      })
    : [];
  type Person = { id: string; name: string | null; image: string | null; profile: { username: string; headline: string | null; isPublic: boolean } | null };
  const people = rows.map((r) => (r as unknown as Record<string, Person>)[key === "followers" ? "follower" : "following"]!).filter((p) => p.profile);

  // Who among them the viewer follows, and who follows the viewer (for "Follow back").
  const ids = people.map((p) => p.id);
  const [mine, theirs] = viewer && ids.length
    ? await Promise.all([
        db.userFollow.findMany({ where: { followerId: viewer.id, followingId: { in: ids } }, select: { followingId: true } }),
        db.userFollow.findMany({ where: { followingId: viewer.id, followerId: { in: ids } }, select: { followerId: true } }),
      ])
    : [[], []];
  const iFollow = new Set(mine.map((m) => m.followingId));
  const followsMe = new Set(theirs.map((t) => t.followerId));

  const tab = (k: ListKey, n: number) => (
    <Link
      href={`/u/${profile.username}/${k}`}
      aria-current={k === key ? "page" : undefined}
      className={`flex-1 border-b-2 pb-3 text-center text-sm font-semibold transition-colors ${k === key ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
    >
      {formatInt(n)} {k === "followers" && n === 1 ? "follower" : LISTS[k].toLowerCase()}
    </Link>
  );

  return (
    <div className="container-page max-w-2xl py-6 sm:py-8">
      <Link href={`/u/${profile.username}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {owner.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">@{profile.username}</h1>
      <nav className="mt-5 flex border-b border-border">{tab("followers", followers)}{tab("following", following)}</nav>

      {!canSee ? (
        <p className="mt-10 flex items-center justify-center gap-2 text-ink-muted"><Lock className="size-4" /> This profile is private.</p>
      ) : people.length === 0 ? (
        <div className="mt-12 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-track text-ink-subtle"><Users className="size-6" /></span>
          <p className="mt-3 font-semibold">{key === "followers" ? "No followers yet" : "Not following anyone yet"}</p>
          <p className="mt-1 text-sm text-ink-muted">{key === "followers" ? "When people follow this profile, they'll show up here." : "People this member follows will show up here."}</p>
        </div>
      ) : (
        <ul className="reveal-group mt-2 divide-y divide-border">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <Link href={`/u/${p.profile!.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={p.name ?? "Member"} src={p.image} size={48} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-sm text-ink-muted">
                    @{p.profile!.username}
                    {viewer && followsMe.has(p.id) && p.id !== viewer.id && <span className="ml-2 rounded-full bg-track px-2 py-0.5 text-xs font-medium">Follows you</span>}
                  </span>
                  {p.profile!.headline && <span className="block truncate text-sm text-ink-subtle">{p.profile!.headline}</span>}
                </span>
              </Link>
              {viewer?.id !== p.id && (
                <FollowButton userId={p.id} following={iFollow.has(p.id)} followsYou={followsMe.has(p.id)} signedIn={!!viewer} size="sm" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
