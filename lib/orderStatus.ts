// Single source of truth for the order fulfillment pipeline (Phase 1).
// Keys are stored in Firestore (orders/<id>.status); labels are shown in Uzbek.

export type OrderStatus =
  | "yangi"
  | "tasdiqlangan"
  | "yetkazilmoqda"
  | "yetkazildi"
  | "bekor"
  | "sotildi"      // completed in-store (POS) sale
  | "qaytarildi";  // returned/refunded — stock restored, revenue reversed

export const DEFAULT_ORDER_STATUS: OrderStatus = "yangi";

export interface OrderStatusMeta {
  key: OrderStatus;
  label: string; // Uzbek label shown in the badge / dropdown
  badge: string; // tailwind classes for the colored pill
}

export const ORDER_STATUSES: OrderStatusMeta[] = [
  { key: "yangi", label: "Yangi", badge: "bg-pink-100 text-pink-700 border-pink-300" },
  { key: "tasdiqlangan", label: "Tasdiqlangan", badge: "bg-amber-100 text-amber-700 border-amber-300" },
  { key: "yetkazilmoqda", label: "Yetkazilmoqda", badge: "bg-blue-100 text-blue-700 border-blue-300" },
  { key: "yetkazildi", label: "Yetkazildi", badge: "bg-green-100 text-green-700 border-green-300" },
  { key: "bekor", label: "Bekor qilindi", badge: "bg-gray-200 text-gray-600 border-gray-300" },
  { key: "sotildi", label: "Sotildi", badge: "bg-teal-100 text-teal-700 border-teal-300" },
  { key: "qaytarildi", label: "Qaytarildi", badge: "bg-orange-100 text-orange-700 border-orange-300" },
];

/** Resolve a stored status to its metadata; unknown / missing → "Yangi". */
export const orderStatusMeta = (status?: string): OrderStatusMeta =>
  ORDER_STATUSES.find((s) => s.key === status) ?? ORDER_STATUSES[0];

// Statuses that mean the shop has COMMITTED the goods to the buyer, so on-hand
// stock should be decremented. A web order leaving "yangi" into any of these
// triggers a one-time stock decrement (guarded by Order.stockApplied); moving it
// back to "bekor" restores the stock. "sotildi" (POS) already decrements at sale.
export const STOCK_COMMITTING_STATUSES: OrderStatus[] = [
  "tasdiqlangan",
  "yetkazilmoqda",
  "yetkazildi",
  "sotildi",
];

/** Does this status commit goods to the buyer (i.e. stock should be consumed)? */
export const isStockCommitting = (status?: string): boolean =>
  STOCK_COMMITTING_STATUSES.includes(status as OrderStatus);

/** Cancelled — the only status that releases previously-committed stock back. */
export const isCancelled = (status?: string): boolean => status === "bekor";
