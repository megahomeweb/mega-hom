import type { ImageT } from "@/lib/types";

/** First usable product image URL (skips empty/malformed entries). */
export function firstImageUrl(images?: ImageT[] | null): string | undefined {
  if (!images?.length) return undefined;
  for (const im of images) {
    const url = im?.url?.trim();
    if (url) return url;
  }
  return undefined;
}
