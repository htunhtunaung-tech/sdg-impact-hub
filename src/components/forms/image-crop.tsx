"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_SOURCE = 15 * 1024 * 1024;

/** Draws the chosen area (after rotation) onto a canvas and returns a JPEG file. */
async function cropToFile(src: string, area: Area, rotation: number, outW: number, outH: number): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Couldn't read this photo. Try another one."));
    i.src = src;
  });
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  // Rotate the whole image on a temporary canvas (react-easy-crop's area is measured on the rotated image)
  const bw = img.naturalWidth * cos + img.naturalHeight * sin;
  const bh = img.naturalWidth * sin + img.naturalHeight * cos;
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(bw);
  rotated.height = Math.round(bh);
  const rc = rotated.getContext("2d")!;
  rc.translate(bw / 2, bh / 2);
  rc.rotate(rad);
  rc.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const oc = out.getContext("2d")!;
  oc.fillStyle = "#ffffff"; // PNGs with transparency get a white background instead of black
  oc.fillRect(0, 0, outW, outH);
  oc.imageSmoothingQuality = "high";
  // The area can reach past the photo when zoomed out; scaling the whole image keeps that part white.
  const k = outW / area.width;
  oc.drawImage(rotated, -area.x * k, -area.y * k, rotated.width * k, rotated.height * k);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw new Error("Couldn't save this photo. Try another one.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export interface CropOptions {
  /** Width / height of the crop area, e.g. 1 for a profile photo, 4 for a cover. */
  aspect: number;
  shape: "round" | "rect";
  /** Saved image size in pixels. */
  width: number;
  height: number;
  /** Below 1 the photo can get smaller than the frame; the gap is saved white. */
  minZoom?: number;
  title: string;
  description: string;
  onDone: (url: string) => void;
}

/**
 * Pick a photo, then move / zoom / rotate it in a dialog and upload the cropped JPEG.
 * Returns `choose()` (opens the file picker), `adjust(url)` (re-opens an existing image), and the
 * hidden file input + dialog to render.
 */
export function useImageCrop(opts: CropOptions) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const minZoom = opts.minZoom ?? 1;

  const adjust = (url: string) => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setArea(null);
    setSrc(url);
  };
  const close = () => {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    setSrc(null);
  };
  const pick = (file: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return void toast.error("Please choose a JPG, PNG or WebP photo.");
    if (file.size > MAX_SOURCE) return void toast.error("That photo is over 15 MB. Please choose a smaller one.");
    adjust(URL.createObjectURL(file));
  };
  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const save = async () => {
    if (!src || !area) return;
    setBusy(true);
    try {
      const file = await cropToFile(src, area, rotation, opts.width, opts.height);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Please try again.");
      opts.onDone(data.url);
      close();
      toast.success("Photo ready. Click Save changes to update your profile.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const element = (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.target.files?.[0])} />
      <Dialog open={src !== null} onOpenChange={(o) => !o && !busy && close()}>
        {src && (
          <DialogContent title={opts.title} description={opts.description}>
            <div className={cn("relative overflow-hidden rounded-[20px] bg-white", opts.shape === "round" ? "h-[300px] sm:h-[340px]" : "h-[220px] sm:h-[260px]")}>
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                minZoom={minZoom}
                restrictPosition={minZoom >= 1}
                maxZoom={4}
                zoomSpeed={0.15}
                aspect={opts.aspect}
                cropShape={opts.shape}
                showGrid={false}
                objectFit="cover"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={() => setZoom((z) => Math.max(minZoom, +(z - 0.1).toFixed(2)))} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted hover:text-ink active:scale-95" aria-label="Zoom out">
                <ZoomOut className="size-5" />
              </button>
              <input
                type="range"
                min={minZoom}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-track accent-[var(--color-primary)]"
              />
              <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted hover:text-ink active:scale-95" aria-label="Zoom in">
                <ZoomIn className="size-5" />
              </button>
              <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted hover:text-ink active:scale-95" aria-label="Rotate 90 degrees">
                <RotateCw className="size-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="button" onClick={save} loading={busy} disabled={!area}>
                Use this photo
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );

  return { choose: () => input.current?.click(), adjust, element, inputRef: input };
}
