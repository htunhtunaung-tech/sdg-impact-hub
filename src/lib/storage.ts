import "server-only";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export type UploadKind = "image" | "evidence";

const LIMITS: Record<UploadKind, { maxBytes: number; types: string[] }> = {
  image: { maxBytes: 5 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] },
  evidence: { maxBytes: 10 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Detect the real file type from magic bytes — never trust the client-supplied MIME type. */
export function sniffMime(buf: Uint8Array): string | null {
  const b = (i: number) => buf[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50)
    return "image/webp";
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "application/pdf";
  return null;
}

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";
const LOCAL_DIR = path.join(process.cwd(), "uploads");

export class UploadError extends Error {}

/**
 * Stores a validated upload and returns its app-relative URL (/api/files/...).
 * Files are always served through /api/files so evidence can be access-checked.
 */
export async function saveUpload(file: File, kind: UploadKind) {
  const limits = LIMITS[kind];
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > limits.maxBytes) throw new UploadError(`Files must be under ${limits.maxBytes / 1024 / 1024} MB.`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !limits.types.includes(mime)) {
    throw new UploadError(kind === "image" ? "Upload a JPG, PNG or WebP image." : "Upload a JPG, PNG, WebP or PDF file.");
  }
  const key = `${kind}/${randomUUID()}.${EXT[mime]}`;
  if (supabase) {
    const { error } = await supabase.storage.from(bucket).upload(key, buf, { contentType: mime, upsert: false });
    if (error) throw new UploadError("Upload failed. Please try again.");
  } else {
    await mkdir(path.join(LOCAL_DIR, kind), { recursive: true });
    await writeFile(path.join(LOCAL_DIR, key), buf);
  }
  return { url: `/api/files/${key}`, mime };
}

const KEY_RE = /^(image|evidence)\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

export async function readUpload(key: string): Promise<{ data: Uint8Array; mime: string } | null> {
  if (!KEY_RE.test(key)) return null;
  const ext = key.split(".").pop()!;
  const mime = Object.entries(EXT).find(([, e]) => e === ext)![0];
  try {
    if (supabase) {
      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error || !data) return null;
      return { data: new Uint8Array(await data.arrayBuffer()), mime };
    }
    return { data: new Uint8Array(await readFile(path.join(LOCAL_DIR, key))), mime };
  } catch {
    return null;
  }
}
