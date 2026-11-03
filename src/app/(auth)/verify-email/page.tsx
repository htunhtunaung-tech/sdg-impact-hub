import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailButton } from "./verify-button";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Confirm your email</h1>
      {token ? (
        <>
          <p className="mt-1 text-ink-muted">One click and you're in.</p>
          <div className="mt-8">
            <VerifyEmailButton token={token} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-ink-muted">
          This link is missing its token. Open the link from your email again, or{" "}
          <Link href="/login" className="font-semibold text-link hover:underline">
            sign in
          </Link>{" "}
          to request a new one.
        </p>
      )}
    </div>
  );
}
