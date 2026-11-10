"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Move, RotateCw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/misc";

const OUTPUT = 512; // px, square; shown at most ~120 px, so this stays sharp on 3x screens
const MAX_SOURCE = 15 * 1024 * 1024;

/** Draws the chosen square (after rotation) onto a canvas and returns a JPEG file. */
async function cropToFile(src: string, area: Area, rotation: number): Promise<File> {
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
  out.width = OUTPUT;
  out.height = OUTPUT;
  const oc = out.getContext("2d")!;
  oc.fillStyle = "#ffffff"; // PNGs with transparency get a white background instead of black
  oc.fillRect(0, 0, OUTPUT, OUTPUT);
  oc.imageSmoothingQuality = "high";
  oc.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, OUTPUT, OUTPUT);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw new Error("Couldn't save this photo. Try another one.");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

/**
 * Profile photo with a circular crop editor: pick a photo, then drag to move, pinch / slider to zoom,
 * and rotate before saving. "Adjust" re-opens the editor for the current photo.
 */
export function AvatarEditor({ name, value, onChange }: { name: string; value: string | null; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (url: string) => {
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
    open(URL.createObjectURL(file));
  };

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const save = async () => {
    if (!src || !area) return;
    setBusy(true);
    try {
      const file = await cropToFile(src, area, rotation);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed. Please try again.");
      onChange(data.url);
      close();
      toast.success("Photo ready. Click Save changes to update your profile.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="avatar-file" onChange={(e) => pick(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative shrink-0 rounded-full ring-offset-2 transition-transform focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
        aria-label={value ? "Change profile photo" : "Add profile photo"}
      >
        <Avatar name={name || "You"} src={value} size={96} className="text-3xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
          <Camera className="size-6" />
        </span>
        <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-card" aria-hidden>
          <Camera className="size-4" />
        </span>
      </button>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
          <Camera /> {value ? "Change photo" : "Upload photo"}
        </Button>
        {value && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => open(value)}>
              <Move /> Adjust
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 /> Remove
            </Button>
          </>
        )}
        <p className="w-full text-xs text-ink-subtle">JPG, PNG or WebP. You can move, zoom and rotate it before saving.</p>
      </div>

      <Dialog open={src !== null} onOpenChange={(o) => !o && !busy && close()}>
        {src && (
          <DialogContent title="Adjust your photo" description="Drag to move it. Pinch, scroll or use the slider to zoom.">
            <div className="relative h-[300px] overflow-hidden rounded-[20px] bg-slate-900 sm:h-[340px]">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                minZoom={1}
                maxZoom={4}
                zoomSpeed={0.15}
                aspect={1}
                cropShape="round"
                showGrid={false}
                objectFit="cover"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted hover:text-ink active:scale-95" aria-label="Zoom out">
                <ZoomOut className="size-5" />
              </button>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-track accent-[var(--color-primary)]"
              />
              <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.2).toFixed(2)))} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-track text-ink-muted hover:text-ink active:scale-95" aria-label="Zoom in">
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
    </div>
  );
}
