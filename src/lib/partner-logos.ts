import "server-only";
import sharp from "sharp";
import { readUpload } from "@/lib/storage";

/**
 * Turns an organization logo (our own upload or an https URL; JPG, PNG, WebP or SVG) into a small PNG
 * data URI that the PDF renderer can draw (it can't read WebP or SVG). Returns null if it can't be loaded
 * in time, so the certificate falls back to the organization's initials instead of failing.
 */
export async function logoAsPng(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    let bytes: Uint8Array | null = null;
    const own = url.match(/^\/api\/files\/(.+)$/);
    if (own) bytes = (await readUpload(own[1]!))?.data ?? null;
    else if (/^https:\/\//.test(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok && Number(res.headers.get("content-length") ?? 0) < 5_000_000) bytes = new Uint8Array(await res.arrayBuffer());
    }
    if (!bytes) return null;
    const png = await sharp(bytes, { density: 300 })
      .resize({ width: 360, height: 180, fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** "Water Aid Isan Network" -> "WA" for organizations without a usable logo. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "•";
