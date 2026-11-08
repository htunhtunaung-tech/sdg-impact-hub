"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Download = server-made A4 PDF (works the same on phones); Print stays available for desktop printers. */
export function PrintButton({ userId }: { userId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => window.print()}>
        <Printer /> Print
      </Button>
      <Button asChild>
        <a href={`/certificate/${userId}/pdf`} download>
          <Download /> Download PDF
        </a>
      </Button>
    </div>
  );
}
