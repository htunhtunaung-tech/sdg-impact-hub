"use client";

import { ImagePlus, Move, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageCrop } from "@/components/forms/image-crop";

/** The default banner when someone has no cover photo (same as the public profile). */
export const DEFAULT_COVER = "bg-gradient-to-r from-forest-900 via-emerald-700 to-emerald-500";

/**
 * Wide cover photo for the profile header, like LinkedIn's (4:1, saved at 1584 x 396).
 * Pick a photo, then move, zoom and rotate it in the crop dialog.
 */
export function CoverEditor({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const cropper = useImageCrop({
    aspect: 4,
    shape: "rect",
    width: 1584,
    height: 396,
    title: "Adjust your cover photo",
    description: "Drag to choose which part shows. Zoom in to crop tighter.",
    onDone: onChange,
  });

  return (
    <div>
      <button
        type="button"
        onClick={cropper.choose}
        className={`group relative block aspect-[4/1] w-full overflow-hidden rounded-[16px] ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent ${value ? "bg-track" : DEFAULT_COVER}`}
        aria-label={value ? "Change cover photo" : "Add cover photo"}
      >
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/35 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
          <ImagePlus className="size-5" /> {value ? "Change cover" : "Add a cover photo"}
        </span>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={cropper.choose}>
          <ImagePlus /> {value ? "Change cover" : "Upload cover"}
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
        <p className="w-full text-xs text-ink-subtle">A wide photo works best, at least 1584 x 396 px. Without one, your profile uses the green banner.</p>
      </div>
      {cropper.element}
    </div>
  );
}
