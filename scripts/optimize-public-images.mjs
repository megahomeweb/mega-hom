/**
 * Build-time optimizer for static raster assets under public/.
 * Product photos live in Firebase and are optimized on upload instead.
 *
 * Usage: node scripts/optimize-public-images.mjs
 * Hooked via package.json "prebuild".
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const MAX_WIDTH = 1920;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const PNG_QUALITY = 80;
/** Skip files already under this size (bytes) unless wider than MAX_WIDTH. */
const SKIP_UNDER_BYTES = 80 * 1024;

const RASTER_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (RASTER_EXT.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function optimizeOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const before = await stat(filePath);
  // Read fully into memory first so the file handle is closed before we write
  // back (Windows cannot overwrite a path sharp still has open).
  const input = await readFile(filePath);
  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const width = meta.width ?? 0;

  if (before.size <= SKIP_UNDER_BYTES && width > 0 && width <= MAX_WIDTH) {
    return { filePath, skipped: true, before: before.size, after: before.size };
  }

  let pipeline = image.rotate(); // honor EXIF orientation
  if (width > MAX_WIDTH) {
    pipeline = pipeline.resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    });
  }

  if (ext === ".png") {
    pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  } else {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  }

  const buffer = await pipeline.toBuffer();
  // Prefer the smaller of optimized vs original when we didn't need a resize.
  if (buffer.length >= before.size && width <= MAX_WIDTH) {
    return { filePath, skipped: true, before: before.size, after: before.size };
  }

  await writeFile(filePath, buffer);
  const after = (await stat(filePath)).size;
  return { filePath, skipped: false, before: before.size, after };
}

function kb(n) {
  return `${(n / 1024).toFixed(1)}KB`;
}

async function main() {
  let files;
  try {
    files = await walk(PUBLIC_DIR);
  } catch (err) {
    console.warn("[optimize-public-images] public/ not found — skipping");
    return;
  }

  if (!files.length) {
    console.log("[optimize-public-images] no raster images found");
    return;
  }

  let saved = 0;
  let optimized = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const result = await optimizeOne(file);
      const rel = path.relative(PUBLIC_DIR, result.filePath);
      if (result.skipped) {
        skipped++;
        continue;
      }
      optimized++;
      saved += result.before - result.after;
      console.log(
        `  ✓ ${rel}: ${kb(result.before)} → ${kb(result.after)}`
      );
    } catch (err) {
      console.warn(
        `  ✗ ${path.relative(PUBLIC_DIR, file)}: ${err?.message || err}`
      );
    }
  }

  console.log(
    `[optimize-public-images] done — ${optimized} optimized, ${skipped} skipped, saved ${kb(saved)}`
  );
}

main().catch((err) => {
  console.error("[optimize-public-images] failed:", err);
  // Don't fail the build over image compression — site still works.
  process.exit(0);
});
