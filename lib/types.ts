import { Timestamp } from "firebase/firestore";
import { OrderStatus } from "./orderStatus";

export interface ProductT {
  id: string;
  title: string;
  price: number;
  productImageUrl: ImageT[];
  category: string;
  subCategory:string;
  description: string;
  quantity: number;          // on-hand stock (decrements on POS sale + web-order fulfillment)
  costPrice?: number;        // tan narx — unit purchase cost; basis for margin/profit (never shown to customers)
  lowStockThreshold?: number; // reorder point — stock at/under this flags "kam qoldi" (default 5)
  isBest: boolean;
  isNew: boolean
  isHidden?: boolean; // true = kept in admin but hidden from the storefront
  ikpu?: string;      // IKPU/MXIK 17-digit fiscal code (tasnif.soliq.uz) — required on a valid ChEK
  vatRate?: number;   // VAT % shown on the fiscal receipt (UZ standard 12; depends on tax regime)
  barcode?: string;   // scannable barcode value for the POS counter (falls back to the doc id)
  time: Timestamp;
  date: Timestamp;
  storageFileId: string;
}

export interface CategoryI {
  id: string;
  name: string;
  subcategory: string[]
}

// Append-only inventory ledger. Every manual stock change writes one row so the
// owner has an auditable history of WHY on-hand changed (goods received,
// written off, or corrected) — separate from sales, which live in `orders`.
// kirim=receive(+) · chiqim=write-off(−) · tuzatish=correct(set) — all manual;
// sotuv=sale(−) · qaytarish=return(+) — auto-logged from orders so the ledger is
// a complete per-product stock card.
export type StockMovementType = "kirim" | "chiqim" | "tuzatish" | "sotuv" | "qaytarish";
export interface StockMovement {
  id: string;
  productId: string;
  productTitle: string;  // snapshot so the ledger reads even if the product is renamed/deleted
  type: StockMovementType;
  delta: number;         // signed change actually applied to on-hand
  newQty?: number;       // resulting on-hand (manual moves only; auto-logged sales omit it)
  reason: string;        // free-text note (e.g. "yangi partiya", "shikastlangan")
  supplierName?: string; // kirim: which supplier the goods came from
  orderNo?: string;      // sotuv/qaytarish: the linked order's number
  actorName: string;
  actorUid: string;
  createdAt: Timestamp;
}

// Yetkazib beruvchi (supplier) — where restocked goods come from.
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: Timestamp;
}

export interface ImageT {
  url: string;
  path: string;
}

// A business expense (chiqim) — rent, salary, utilities, restock cost, ads, etc.
// Net profit = realized revenue − COGS − expenses (over a period).
export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;   // Ijara / Maosh / Kommunal / Tovar / Reklama / Boshqa
  note?: string;
  date: Timestamp;
  actorName: string;
  actorUid: string;
}

export interface Order {
  id: string;
  orderNo?: string;           // short human-quotable reference (e.g. MH-K3F9A2) — docId stays the real key
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  date: Timestamp;
  basketItems: ProductT[];
  totalPrice: number;
  totalQuantity: number;
  status?: OrderStatus;
  stockApplied?: boolean;     // true once this order's lines have decremented on-hand stock (idempotency guard)
  lastChangedBy?: string;     // display-only "who last touched this" hint
  lastChangedAt?: Timestamp;
  channel?: "web" | "store";  // where the sale came from (default web)
  cashierUid?: string;        // staff who rang up an in-store (POS) sale
  paymentMethod?: string;     // e.g. "naqd" (cash) — POS sales
  // Fulfillment (web/phone orders) — captured at checkout, shown on the packing slip.
  deliveryAddress?: string;
  deliveryDate?: string;      // free-text or ISO date the customer wants it by
  note?: string;              // order-level note (e.g. "call before delivery")
}

export interface  userT {
  name: string;
  email: string | null;
  uid: string;
  role: string;
  time: Timestamp;
  date: string;
}

// Derived customer (computed from orders, keyed by normalized phone; enriched
// by the optional `customers` collection). Never stored as-is.
export interface CustomerT {
  phone: string;        // normalized key, e.g. 998901234567 ("no-phone" bucket otherwise)
  displayPhone: string; // pretty +998 .. (or "Telefonsiz")
  name: string;
  orderCount: number;
  totalSpent: number;
  totalItems: number;
  avgTicket: number;
  firstOrderAt: number | null; // ms epoch
  lastOrderAt: number | null;  // ms epoch
  orders: Order[];
  tags: string[];
  note: string;
  city: string;
}