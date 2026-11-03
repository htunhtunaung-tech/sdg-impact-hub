import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { UserRow } from "../admin-actions";
import { AdminSearch } from "../admin-search";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireAdminPage();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { profile: { username: { contains: q, mode: "insensitive" } } }] } : {};
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, include: { profile: { select: { username: true } }, _count: { select: { impactSubmissions: true, reportsFiled: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
  ]);
  return (
    <div className="space-y-4">
      <AdminSearch placeholder="Search name, email or username" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border bg-canvas text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-3">Member</th><th className="px-3 py-3">Joined</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Status</th><th className="px-4 py-3">Role & actions</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.image} size={32} />
                    <span>{u.profile ? <Link href={`/u/${u.profile.username}`} className="font-semibold hover:underline">{u.name}</Link> : <span className="font-semibold">{u.name}</span>}<span className="block text-xs text-ink-muted">{u.email}</span></span>
                  </span>
                </td>
                <td className="px-3 py-3 text-ink-muted">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-3">{u.emailVerified ? <Badge variant="success">verified</Badge> : <Badge variant="warning">unverified</Badge>}</td>
                <td className="px-3 py-3">{u.status === "ACTIVE" ? <Badge variant="success">active</Badge> : <Badge variant="danger">suspended</Badge>}</td>
                <td className="px-4 py-3"><UserRow userId={u.id} role={u.role} status={u.status} self={u.id === me.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pagination page={page} total={total} pageSize={20} basePath="/admin/users" params={q ? `q=${encodeURIComponent(q)}` : ""} />
    </div>
  );
}
