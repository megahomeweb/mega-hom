// Phone-first auth WITHOUT SMS infrastructure: Firebase email/password is the
// only enabled credential, but most Uzbek shoppers register with a phone, not
// an inbox. Phone-only accounts therefore authenticate with a deterministic
// synthetic address on a domain we control — the user only ever types their
// phone number, on sign-up and on login alike. Real emails, when given, are
// used as-is (and keep the "forgot password" email flow possible).
import { normalizePhone } from "./phone";

export const SYNTHETIC_EMAIL_DOMAIN = "mijoz.megahome.uz";

/** Auth email for a normalized UZ phone: 998901234567 → 998901234567@mijoz.megahome.uz */
export const phoneAuthEmail = (normalizedPhone: string) =>
  `${normalizedPhone}@${SYNTHETIC_EMAIL_DOMAIN}`;

/** True for addresses we minted from a phone (never show these as real emails). */
export const isSyntheticEmail = (email?: string | null) =>
  !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);

/** Map a login identifier — real email OR phone in any format — to the Firebase
 *  auth email. Unrecognizable input is returned as-is so Firebase produces its
 *  normal invalid-credential error. */
export function loginIdentifierToEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed;
  const phone = normalizePhone(trimmed);
  return phone ? phoneAuthEmail(phone) : trimmed;
}
