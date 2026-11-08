"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Download = the server-made A4 PDF. We fetch it here (with the signed-in session) and save it from memory,
 * because Android's download manager re-requests plain download links without the session and saves an
 * empty file. Any failure is shown as a message instead. Print stays available on larger screens.
 */
export function PrintButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`/certificate/${userId}/pdf`, { credentials: "same-origin", cache: "no-store" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("application/pdf")) {
        const reason = type.includes("text/plain") ? (await res.text()).slice(0, 200) : `The server answered ${res.status}.`;
        throw new Error(reason || "The certificate could not be created.");
      }
      const blob = await res.blob();
      if (blob.size < 1000) throw new Error("The PDF came back empty. Please try again.");
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "SDG-Impact-Hub-Certificate.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("Certificate downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
      <Button onClick={download} disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />} {busy ? "Preparing PDF…" : "Download PDF"}
      </Button>
    </div>
  );
}
