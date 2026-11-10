"use client";

import { Camera, Move, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { useImageCrop } from "@/components/forms/image-crop";

/**
 * Profile photo with a round crop editor: pick a photo, then drag to move, pinch / slider to zoom
 * (down to 0.4x, so head and shoulders fit) and rotate before saving. "Adjust" re-opens the current photo.
 */
export function AvatarEditor({ name, value, onChange }: { name: string; value: string | null; onChange: (url: string | null) => void }) {
  const cropper = useImageCrop({
    aspect: 1,
    shape: "round",
    width: 512,
    height: 512,
    minZoom: 0.4,
    title: "Adjust your photo",
    description: "Drag to move it. Zoom out to show more of you, or zoom in for a close-up.",
    onDone: onChange,
  });

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={cropper.choose}
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
        <Button type="button" variant="secondary" size="sm" onClick={cropper.choose}>
          <Camera /> {value ? "Change photo" : "Upload photo"}
        </Button>
        {value && (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => cropper.adjust(value)}>
              <Move /> Adjust
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 /> Remove
            </Button>
          </>
        )}
        <p className="w-full text-xs text-ink-subtle">JPG, PNG or WebP. You can move, zoom and rotate it before saving.</p>
      </div>
      {cropper.element}
    </div>
  );
}
