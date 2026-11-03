"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { addOrganizationMemberAction, removeOrganizationMemberAction } from "@/server/actions/organizations";

export function OrgTeamManager({ orgId, members }: { orgId: string; members: { userId: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); setUsername(""); router.refresh(); } else toast.error(r.error);
    });
  return (
    <div className="mt-5 space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold">Add a team member</p>
      <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" aria-label="Username" />
      <div className="flex gap-2">
        <Select value={role} onChange={(e) => setRole(e.target.value as "MEMBER" | "ADMIN")} aria-label="Role"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></Select>
        <Button loading={pending} disabled={!username.trim()} onClick={() => run(() => addOrganizationMemberAction(orgId, username, role))}>Add</Button>
      </div>
      {members.length > 0 && (
        <ul className="space-y-1 pt-2">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between text-sm">
              {m.name}
              <button type="button" className="text-xs font-semibold text-danger hover:underline" onClick={() => confirm(`Remove ${m.name}?`) && run(() => removeOrganizationMemberAction(orgId, m.userId))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
