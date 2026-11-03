import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/misc";
import { OrganizationForm } from "./org-form";

export const metadata: Metadata = { title: "Register an organization" };

export default async function NewOrganizationPage() {
  await requireUser("/organizations/new");
  return (
    <div className="container-page max-w-2xl py-6 sm:py-8">
      <PageHeader title="Register an organization" description="Verified organizations can publish projects without review and show a verified badge." />
      <OrganizationForm />
    </div>
  );
}
