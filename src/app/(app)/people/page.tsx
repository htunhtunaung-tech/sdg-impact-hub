import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search, Sparkles, UserSearch } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cn, formatInt } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { SdgNumber } from "@/components/sdg/sdg-badge";
import { FollowButton } from "@/components/social/follow-button";

export const metadata: Metadata = { title: "People" };

const PAGE_SIZE = 24;
const ROLES = [
  { key: "all", label: "Everyone" },
  { key: "VOLUNTEER", label: "Volunteers" },
  { key: "STUDENT", label: "Students" },
  { key: "ORGANIZER", label: "Organizers" },
  { key: "ORGANIZATION", label: "Organizations" },
] as const;
const SORTS = [
  { key: "suggested", label: "Suggested" },
  { key: "new", label: "Newest" },
  { key: "popular", label: "Most followed" },
] as const;
const ROLE_LABEL: Record<string, string> = { INDIVIDUAL: "Member", STUDENT: "Student", VOLUNTEER: "Volunteer", ORGANIZER: "Project organizer", ORGANIZATION: "Organization", ADMIN: "Administrator" };

type SP = { q?: string; role?: string; sort?: string; page?: string };

/**
 * Everyone on SDG Impact Hub with a public profile, to browse and follow (like Instagram's Explore people).
 * "Suggested" ranks people who share your goals, are followed by people you follow, or live in your city.
 */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().replace(/^@+/, "").slice(0, 60);
  const role = ROLES.some((r) => r.key === sp.role) ? sp.role! : "all";
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort! : "suggested";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.UserWhereInput = {
    id: { not: me.id },
    status: "ACTIVE",
    profile: { isPublic: true },
    ...(role !== "all" ? { role: role as Prisma.EnumUserRoleFilter["equals"] } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { profile: { username: { contains: q.toLowerCase() } } }, { profile: { headline: { contains: q, mode: "insensitive" } } }, { profile: { city: { contains: q, mode: "insensitive" } } }] }
      : {}),
  };

  const [myGoals, myFollowing, myProfile, followersOfMe, total] = await Promise.all([
    db.userSdgInterest.findMany({ where: { userId: me.id }, select: { goalId: true } }),
    db.userFollow.findMany({ where: { followerId: me.id }, select: { followingId: true } }),
    db.userProfile.findUnique({ where: { userId: me.id }, select: { city: true } }),
    db.userFollow.findMany({ where: { followingId: me.id }, select: { followerId: true } }),
    db.user.count({ where }),
  ]);
  const goalSet = new Set(myGoals.map((g) => g.goalId));
  const iFollow = new Set(myFollowing.map((f) => f.followingId));
  const followsMe = new Set(followersOfMe.map((f) => f.followerId));

  const select = {
    id: true, name: true, image: true, role: true, createdAt: true,
    profile: { select: { username: true, headline: true, city: true, country: true, coverImage: true } },
    sdgInterests: { select: { goalId: true }, orderBy: { goalId: "asc" as const } },
    _count: { select: { followers: true } },
  } satisfies Prisma.UserSelect;
  type Person = Prisma.UserGetPayload<{ select: typeof select }>;

  let people: Person[];
  let why = new Map<string, string>();
  if (sort === "suggested") {
    // Small community: score everyone who matches, then page in memory.
    const all = await db.user.findMany({ where, select, take: 1000 });
    const ids = all.map((p) => p.id);
    const viaFriends = iFollow.size
      ? await db.userFollow.groupBy({ by: ["followingId"], where: { followerId: { in: [...iFollow] }, followingId: { in: ids } }, _count: true })
      : [];
    const friendCount = new Map(viaFriends.map((v) => [v.followingId, v._count]));
    const city = myProfile?.city?.toLowerCase();
    const scored = all.map((p) => {
      const shared = p.sdgInterests.filter((g) => goalSet.has(g.goalId)).length;
      const friends = friendCount.get(p.id) ?? 0;
      const sameCity = !!city && p.profile?.city?.toLowerCase() === city;
      const score = (iFollow.has(p.id) ? -100 : 0) + (followsMe.has(p.id) ? 8 : 0) + friends * 4 + shared * 3 + (sameCity ? 2 : 0) + Math.min(p._count.followers, 20) * 0.1;
      const reason = followsMe.has(p.id) && !iFollow.has(p.id) ? "Follows you"
        : friends ? `Followed by ${friends} ${friends === 1 ? "person" : "people"} you follow`
        : shared ? `${shared} goal${shared === 1 ? "" : "s"} in common`
        : sameCity ? `Also in ${p.profile!.city}` : "";
      return { p, score, reason };
    });
    scored.sort((a, b) => b.score - a.score || +b.p.createdAt - +a.p.createdAt);
    why = new Map(scored.map((s) => [s.p.id, s.reason]));
    people = scored.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => s.p);
  } else {
    people = await db.user.findMany({
      where,
      select,
      orderBy: sort === "popular" ? [{ followers: { _count: "desc" } }, { createdAt: "desc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  const params = new URLSearchParams({ ...(q ? { q } : {}), ...(role !== "all" ? { role } : {}), ...(sort !== "suggested" ? { sort } : {}) }).toString();
  const link = (patch: Partial<SP>) => {
    const s = new URLSearchParams({ ...(q ? { q } : {}), ...(role !== "all" ? { role } : {}), ...(sort !== "suggested" ? { sort } : {}) });
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all" || v === "suggested") s.delete(k);
      else s.set(k, v);
    }
    const str = s.toString();
    return `/people${str ? `?${str}` : ""}`;
  };

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">People</h1>
          <p className="mt-1 text-ink-muted">Find and follow volunteers, students and organizers on SDG Impact Hub.</p>
        </div>
        <p className="text-sm text-ink-muted"><b className="text-ink">{formatInt(total)}</b> {total === 1 ? "person" : "people"}{q ? ` matching “${q}”` : ""}</p>
      </div>

      <form action="/people" className="mt-5 flex flex-col gap-3 sm:flex-row">
        {role !== "all" && <input type="hidden" name="role" value={role} />}
        {sort !== "suggested" && <input type="hidden" name="sort" value={sort} />}
        <label className="relative flex-1">
          <span className="sr-only">Search people</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search by name, @username, city or headline" className="h-12 w-full rounded-full border border-border-strong bg-surface pl-12 pr-4 text-[15px] outline-none transition-colors placeholder:text-ink-subtle focus:border-accent" />
        </label>
        <button type="submit" className="h-12 rounded-full bg-primary px-6 font-semibold text-white transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.97]">Search</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by role" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {ROLES.map((r) => (
            <Link key={r.key} href={link({ role: r.key, page: undefined })} aria-current={role === r.key ? "page" : undefined}
              className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", role === r.key ? "border-transparent bg-primary text-white" : "border-border-strong bg-surface text-ink-muted hover:text-ink")}>
              {r.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Sort" className="flex items-center gap-1 rounded-full bg-track p-1 text-sm">
          {SORTS.map((s) => (
            <Link key={s.key} href={link({ sort: s.key, page: undefined })} aria-current={sort === s.key ? "page" : undefined}
              className={cn("rounded-full px-3.5 py-1.5 font-semibold transition-colors", sort === s.key ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}>
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {sort === "suggested" && !q && goalSet.size === 0 && (
        <p className="mt-4 flex items-center gap-2 rounded-[14px] bg-mint px-4 py-3 text-sm text-ink">
          <Sparkles className="size-4 shrink-0" aria-hidden /> Pick the goals you care about in <Link href="/settings" className="font-semibold underline">Settings</Link> to get better suggestions.
        </p>
      )}

      {people.length === 0 ? (
        <div className="mt-16 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-track text-ink-subtle"><UserSearch className="size-6" /></span>
          <p className="mt-3 font-semibold">No one found</p>
          <p className="mt-1 text-sm text-ink-muted">Try another name or clear the filters. Only public profiles appear here.</p>
        </div>
      ) : (
        <ul className="reveal-group mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => {
            const u = p.profile!;
            const shared = p.sdgInterests.filter((g) => goalSet.has(g.goalId)).map((g) => g.goalId);
            const goals = (shared.length ? shared : p.sdgInterests.map((g) => g.goalId)).slice(0, 5);
            const reason = why.get(p.id) || (followsMe.has(p.id) && !iFollow.has(p.id) ? "Follows you" : "");
            return (
              <li key={p.id} className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-card transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-raised">
                <div className={cn("relative h-16 shrink-0", !u.coverImage && "bg-gradient-to-r from-forest-900 via-emerald-700 to-emerald-500")}>
                  {u.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.coverImage} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex flex-1 flex-col px-4 pb-4">
                  <div className="-mt-8 flex items-start justify-between gap-3">
                    <Link href={`/u/${u.username}`} className="rounded-full" aria-label={`${p.name}'s profile`}>
                      <Avatar name={p.name ?? "Member"} src={p.image} size={64} className="border-4 border-surface text-xl" />
                    </Link>
                    <FollowButton refresh={false} userId={p.id} following={iFollow.has(p.id)} followsYou={followsMe.has(p.id)} signedIn size="sm" className="mt-11" />
                  </div>
                  <Link href={`/u/${u.username}`} className="mt-2 min-w-0 hover:underline">
                    <span className="block truncate text-[17px] font-bold">{p.name}</span>
                  </Link>
                  <p className="truncate text-sm text-ink-muted">@{u.username} · {ROLE_LABEL[p.role] ?? "Member"}</p>
                  {u.headline && <p className="mt-1.5 line-clamp-2 text-sm">{u.headline}</p>}
                  <div className="mt-auto pt-3">
                    {goals.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1" aria-label="Goals they care about">
                        {goals.map((g) => <SdgNumber key={g} goal={g} size={24} />)}
                      </div>
                    )}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span><b className="text-ink">{formatInt(p._count.followers)}</b> {p._count.followers === 1 ? "follower" : "followers"}</span>
                      {u.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{u.city}</span>}
                      {reason && <span className="rounded-full bg-mint px-2 py-0.5 font-medium text-ink">{reason}</span>}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/people" params={params} />
    </div>
  );
}
