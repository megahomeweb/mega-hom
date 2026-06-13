// Single source of truth for the order fulfillment pipeline (Phase 1).
// Keys are stored in Firestore (orders/<id>.status); labels are shown in Uzbek.

export type OrderStatus =
  | "yangi"
  | "tasdiqlangan"
  | "yetkazilmoqda"
  | "yetkazildi"
  | "bekor"
  | "sotildi"; // completed in-store (POS) sale

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
];

/** Resolve a stored status to its metadata; unknown / missing → "Yangi". */
export const orderStatusMeta = (status?: string): OrderStatusMeta =>
  ORDER_STATUSES.find((s) => s.key === status) ?? ORDER_STATUSES[0];
