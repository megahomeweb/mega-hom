// Public site origin used wherever an absolute URL is required (QR codes,
// share links). QR stickers are printed on physical products, so they must
// always point at the production domain — never localhost or a preview URL.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://megahome.uz").replace(/\/$/, "");

/** Absolute storefront URL of a product page — this is what the QR encodes. */
export const productUrl = (id: string): string => `${SITE_URL}/product/${id}`;
