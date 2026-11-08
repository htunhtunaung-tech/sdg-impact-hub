"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return <Button onClick={() => window.print()}><Download /> Download PDF</Button>;
}
