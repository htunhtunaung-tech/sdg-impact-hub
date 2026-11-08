import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

/** Short link to your own certificate (used in the account menu). */
export default async function MyCertificate() {
  const user = await requireUser("/certificate");
  redirect(`/certificate/${user.id}`);
}
