/**
 * Browser-side product image optimizer — resize + compress before Firebase upload.
 * Replaces Vercel Image Optimization for catalog photos (which aren't known at build time).
 */

const MAX_EDGE = 1600;
const QUALITY = 0.82;
/** Skip re-encode when already small enough and within the max edge. */
const SKIP_UNDER_BYTES = 300 * 1024;

function extensionFor(mime: string): string {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "jpg";
}

/** Formats browsers can't render in <img> (iPhone HEIC, TIFF). Uploading one
 *  as-is puts a permanently broken "?" photo on the storefront for everyone
 *  except Safari users — they MUST be converted, or rejected with a clear error. */
function isBrowserHostileFormat(file: File): boolean {
  return (
    /image\/(hei[cf]|tiff?)/i.test(file.type) || /\.(hei[cf]|tiff?)$/i.test(file.name)
  );
}

function baseName(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > 0 ? filename.slice(0, i) : filename;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function detectWebpSupport(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const blob = await canvasToBlob(canvas, "image/webp", 0.8);
  return Boolean(blob && blob.type === "image/webp" && blob.size > 0);
}

/**
 * Resize (long edge ≤ 1600px) and encode as WebP (JPEG fallback).
 * Returns the original file when it's already small enough.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  const hostile = isBrowserHostileFormat(file);
  if (!file.type.startsWith("image/") && !hostile) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (hostile) {
      // Chrome/Android can't decode HEIC at all — refuse instead of shipping a
      // photo that renders as "?" for most visitors.
      throw new Error(
        `"${file.name}": HEIC/TIFF formatini brauzer koʼrsata olmaydi. iPhone'da Sozlamalar → Kamera → Formatlar → "Most Compatible" qilib qayta suratga oling yoki JPG/PNG yuklang.`
      );
    }
    return file; // other undecodable image — let Storage reject or accept as-is
  }

  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  // A hostile format is NEVER "already small" — it must be re-encoded even
  // when tiny (Safari decodes HEIC fine and would otherwise skip conversion).
  const alreadySmall = !hostile && file.size <= SKIP_UNDER_BYTES && longEdge <= MAX_EDGE;

  if (alreadySmall) {
    bitmap.close();
    return file;
  }

  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const preferWebp = await detectWebpSupport();
  const mime = preferWebp ? "image/webp" : "image/jpeg";
  let blob = await canvasToBlob(canvas, mime, QUALITY);

  // If WebP somehow failed, fall back to JPEG.
  if (!blob || blob.size === 0) {
    blob = await canvasToBlob(canvas, "image/jpeg", QUALITY);
  }
  if (!blob) {
    if (hostile)
      throw new Error(`"${file.name}": rasmni JPG/WebP formatiga oʼgirib boʼlmadi`);
    return file;
  }

  // Prefer the smaller of optimized vs original when dimensions didn't change
  // much — but never hand back a browser-hostile original.
  if (!hostile && blob.size >= file.size && longEdge <= MAX_EDGE) {
    return file;
  }

  const name = `${baseName(file.name)}.${extensionFor(blob.type || mime)}`;
  return new File([blob], name, { type: blob.type || mime, lastModified: Date.now() });
}

/** Optimize every file in a FileList / File[]; preserves order. */
export async function optimizeImagesForUpload(
  files: FileList | File[]
): Promise<File[]> {
  const list = Array.from(files);
  return Promise.all(list.map((f) => optimizeImageForUpload(f)));
}
