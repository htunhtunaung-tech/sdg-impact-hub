"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Flag, Heart, Lightbulb, MessageCircle, MoreHorizontal, PartyPopper, HandHeart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { deletePostAction, toggleReactionAction } from "@/server/actions/community";
import { ReportDialog } from "./report-dialog";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "LIKE", label: "Like", Icon: Heart },
  { key: "CELEBRATE", label: "Celebrate", Icon: PartyPopper },
  { key: "SUPPORT", label: "Support", Icon: HandHeart },
  { key: "INSIGHTFUL", label: "Insightful", Icon: Lightbulb },
] as const;

export function PostActions({ postId, counts, mine, comments, canDelete, signedIn, isOwn }: {
  postId: string; counts: Record<string, number>; mine: string | null; comments: number; canDelete: boolean; signedIn: boolean; isOwn: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [reportOpen, setReportOpen] = useState(false);
  const [state, setState] = useOptimistic({ counts, mine }, (s, type: string) => {
    const c = { ...s.counts };
    if (s.mine) c[s.mine] = Math.max((c[s.mine] ?? 1) - 1, 0);
    if (s.mine === type) return { counts: c, mine: null };
    c[type] = (c[type] ?? 0) + 1;
    return { counts: c, mine: type };
  });

  const react = (type: string) => {
    if (!signedIn) return router.push("/login?callbackUrl=/community");
    start(async () => {
      setState(type);
      const res = await toggleReactionAction(postId, type);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  };

  return (
    <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
      {TYPES.map(({ key, label, Icon }) => {
        const n = state.counts[key] ?? 0;
        const active = state.mine === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => react(key)}
            aria-pressed={active}
            aria-label={n ? `${n} ${label}` : label}
            title={label}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm transition-colors",
              active ? "bg-mint font-semibold text-forest-900" : "text-ink-muted hover:bg-slate-100",
            )}
          >
            <Icon className={cn("size-4", active && "fill-current")} /> {n > 0 && n}
          </button>
        );
      })}
      <Link href={`/community/post/${postId}`} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-ink-muted hover:bg-slate-100">
        <MessageCircle className="size-4" /> {comments} {comments === 1 ? "comment" : "comments"}
      </Link>
      {signedIn && (
        <Dropdown>
          <DropdownTrigger className="inline-flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-slate-100" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </DropdownTrigger>
          <DropdownContent>
            {!isOwn && (
              <DropdownItem onSelect={() => setReportOpen(true)}>
                <Flag /> Report post
              </DropdownItem>
            )}
            {canDelete && (
              <DropdownItem
                className="text-danger"
                onSelect={() => {
                  if (!confirm("Delete this post?")) return;
                  start(async () => {
                    const res = await deletePostAction(postId);
                    if (res.ok) {
                      toast.success(res.message);
                      router.refresh();
                    } else toast.error(res.error);
                  });
                }}
              >
                <Trash2 /> Delete post
              </DropdownItem>
            )}
          </DropdownContent>
        </Dropdown>
      )}
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="POST" targetId={postId} />
    </footer>
  );
}
