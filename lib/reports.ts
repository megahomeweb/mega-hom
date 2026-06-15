// Single source of truth for turning raw orders into owner-facing numbers.
// Pure (no Firebase/React) so it can run in any KPI card, report, or export.
//
// DEFINITIONS (so every screen agrees):
//  • "realized" order  = NOT cancelled (status !== "bekor"). Cancelled orders
//    never count toward revenue/profit — fixing the old dashboard that summed
//    every order including cancellations.
//  • revenue (savdo)   = sum of totalPrice over realized orders.
//  • COGS (tan qiymat) = sum over lines of unitCost × qty, where unitCost is the
//    snapshot taken at sale time (costAtSale on POS lines, costPrice on web
//    lines). Lines without a cost contribute 0 — profit just understates rather
//    than lying.
//  • profit (foyda)    = revenue − COGS.

import { Order } from "./types";

/** Epoch ms for an order's date (tolerates Firestore Timestamp / Date / seconds). */
export function orderMs(o: Order): number {
  const d = o.date as unknown as { seconds?: number; toDate?: () => Date } | Date | undefined;
  if (!d) return 0;
  if (d instanceof Date) return d.getTime();
  if (typeof d.seconds === "number") return d.seconds * 1000;
  if (typeof (d as { toDate?: () => Date }).toDate === "function") {
    try { return (d as { toDate: () => Date }).toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

/** A cancelled OR returned order contributes nothing to money totals. */
export const isRealized = (o: Order): boolean =>
  o.status !== "bekor" && o.status !== "qaytarildi";

/** Revenue for one order (0 if cancelled). */
export const orderRevenue = (o: Order): number =>
  isRealized(o) ? Number(o.totalPrice) || 0 : 0;

/** Cost of goods for one order from per-line cost snapshots (0 if cancelled). */
export function orderCogs(o: Order): number {
  if (!isRealized(o)) return 0;
  let cogs = 0;
  for (const line of o.basketItems ?? []) {
    const c = line as unknown as { costAtSale?: number; costPrice?: number; quantity?: number };
    const unit = Number(c.costAtSale ?? c.costPrice ?? 0) || 0;
    cogs += unit * (Number(c.quantity) || 0);
  }
  return cogs;
}

export interface OrderFilter {
  from?: number;                 // epoch ms (inclusive)
  to?: number;                   // epoch ms (exclusive)
  channel?: "web" | "store";     // omit = both
  realizedOnly?: boolean;        // default true — exclude cancelled
}

/** Does an order pass the filter? Channel defaults to "web" when missing. */
export function matchesFilter(o: Order, f: OrderFilter = {}): boolean {
  if ((f.realizedOnly ?? true) && !isRealized(o)) return false;
  if (f.channel && (o.channel ?? "web") !== f.channel) return false;
  if (f.from !== undefined || f.to !== undefined) {
    const ms = orderMs(o);
    if (f.from !== undefined && ms < f.from) return false;
    if (f.to !== undefined && ms >= f.to) return false;
  }
  return true;
}

export interface OrderAggregate {
  count: number;       // number of orders
  revenue: number;     // sum of totalPrice
  cogs: number;        // sum of cost of goods
  profit: number;      // revenue − cogs
  items: number;       // total units sold
}

/** Reduce a filtered slice of orders to the headline numbers. */
export function aggregateOrders(orders: Order[], f: OrderFilter = {}): OrderAggregate {
  let count = 0, revenue = 0, cogs = 0, items = 0;
  for (const o of orders) {
    if (!matchesFilter(o, f)) continue;
    count++;
    revenue += Number(o.totalPrice) || 0;
    cogs += orderCogs(o);
    items += Number(o.totalQuantity) || 0;
  }
  return { count, revenue, cogs, profit: revenue - cogs, items };
}

/* ----------------------------- date helpers ------------------------------ */
// Local-time period boundaries so "Bugun" matches the owner's wall clock.

export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
/** Start of the window N days back (N=7 → last 7 days incl. today). */
export function startOfDaysAgo(days: number, now = new Date()): number {
  return startOfToday(now) - (days - 1) * 86_400_000;
}

/* ----------------------------- chart series ------------------------------ */

export interface DayPoint {
  label: string; // "DD.MM"
  revenue: number;
  profit: number;
  count: number;
}

/** Daily revenue/profit/order-count for the last N days (oldest → newest).
 *  Realized orders only; empty days are 0 so the chart line is continuous. */
export function dailySeries(orders: Order[], days: number, now = new Date()): DayPoint[] {
  const start = startOfToday(now) - (days - 1) * 86_400_000;
  const buckets: DayPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * 86_400_000);
    buckets.push({
      label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      revenue: 0,
      profit: 0,
      count: 0,
    });
  }
  for (const o of orders) {
    if (!isRealized(o)) continue;
    const ms = orderMs(o);
    if (ms < start) continue;
    const idx = Math.floor((ms - start) / 86_400_000);
    if (idx < 0 || idx >= days) continue;
    const rev = Number(o.totalPrice) || 0;
    buckets[idx].revenue += rev;
    buckets[idx].profit += rev - orderCogs(o);
    buckets[idx].count += 1;
  }
  return buckets;
}

export interface CategoryPoint {
  category: string;
  revenue: number;
  units: number;
}

/** Revenue + units by product category, from realized order line items. */
export function byCategory(orders: Order[], f: OrderFilter = {}): CategoryPoint[] {
  const map = new Map<string, CategoryPoint>();
  for (const o of orders) {
    if (!matchesFilter(o, f)) continue;
    for (const line of o.basketItems ?? []) {
      const c = line as unknown as { category?: string; price?: number; quantity?: number };
      const cat = (c.category || "—").toString();
      const qty = Number(c.quantity) || 0;
      const cur = map.get(cat) ?? { category: cat, revenue: 0, units: 0 };
      cur.revenue += (Number(c.price) || 0) * qty;
      cur.units += qty;
      map.set(cat, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}
