import { requireAdminPage } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-link">Administration</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[32px]">Admin dashboard</h1>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
