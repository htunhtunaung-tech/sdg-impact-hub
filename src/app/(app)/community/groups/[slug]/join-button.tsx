"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleGroupMembershipAction } from "@/server/actions/community";

export function JoinGroupButton({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant={isMember ? "secondary" : "primary"} loading={pending} onClick={() => start(async () => {
      const res = await toggleGroupMembershipAction(groupId);
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    })}>
      {isMember ? "Leave group" : "Join group"}
    </Button>
  );
}
