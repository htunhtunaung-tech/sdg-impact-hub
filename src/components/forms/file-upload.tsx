"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileUpload({
  value,
  onChange,
  kind = "image",
  label,
  id,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  kind?: "image" | "evidence";
  label: string;
  id: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const isImage = value && !value.endsWith(".pdf");
  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        accept={kind === "image" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf"}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {value ? (
        <div className="relative inline-flex items-center gap-3 rounded-[12px] border border-border bg-surface p-2 pr-10">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Uploaded preview" className="h-16 w-24 rounded-md object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-md bg-canvas"><FileText className="size-6 text-ink-muted" /></span>
          )}
          <span className="text-sm text-ink-muted">Uploaded</span>
          <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 rounded-md p-1 hover:bg-slate-100" aria-label="Remove file">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-border-strong bg-canvas px-4 py-6 text-center text-sm text-ink-muted transition-colors hover:border-accent hover:bg-mint/40",
            busy && "pointer-events-none opacity-70",
          )}
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          <span className="font-semibold text-ink">{busy ? "Uploading…" : label}</span>
          <span className="text-xs">{kind === "image" ? "JPG, PNG or WebP · up to 5 MB" : "Photo or PDF · up to 10 MB"}</span>
        </label>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
