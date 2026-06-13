// Uzbek phone-number helpers — shared by order contact buttons (Phase 1) and
// the future customer CRM (keyed by the normalized number). Pure, no imports.

/** Canonical key for an Uzbek phone: digits only, forced to 998XXXXXXXXX.
 *  Returns "" when the input can't be read as an Uzbek number. */
export function normalizePhone(raw: unknown): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // 00998… → 998…
  if (d.length === 9) d = "998" + d; // bare 9-digit mobile (90 123 45 67)
  else if (d.length === 10 && d.startsWith("0")) d = "998" + d.slice(1); // 0XX… → 998XX…
  return d.length === 12 && d.startsWith("998") ? d : "";
}

/** Pretty display form "+998 90 123 45 67"; falls back to the trimmed raw input
 *  when the value isn't a recognizable Uzbek number. */
export function formatPhone(raw: unknown): string {
  const d = normalizePhone(raw);
  if (d.length !== 12) return String(raw ?? "").trim();
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/** href for a tel: link — normalized E.164 ("+998…") when possible, else the raw
 *  digits, else "" (so the caller can hide the button). */
export function telHref(raw: unknown): string {
  const d = normalizePhone(raw);
  if (d) return `tel:+${d}`;
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : "";
}

/** href for a Telegram chat link, or "" when the number isn't a valid UZ mobile. */
export function telegramHref(raw: unknown): string {
  const d = normalizePhone(raw);
  return d ? `https://t.me/+${d}` : "";
}
