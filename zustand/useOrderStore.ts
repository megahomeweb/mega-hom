import {create} from "zustand";
import { collection, deleteDoc, doc, addDoc, getDocs, increment, query, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, where, writeBatch, FieldValue, Timestamp } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { ImageT, Order } from "@/lib/types";
import { DEFAULT_ORDER_STATUS, OrderStatus, isStockCommitting } from "@/lib/orderStatus";

// Cap how many (most-recent) orders the admin loads at once. Bounds Firestore
// reads + in-memory work as the collection grows; the full history stays
// available via CSV export. 1000 comfortably covers the dashboard periods,
// recent order management, and top-sellers for a single shop.
export const ORDER_FETCH_LIMIT = 1000;

// Short, human-quotable order reference (e.g. "MH-K3F9A2"). The Firestore docId
// stays the real key; this is only what staff/customers say out loud or write on
// a slip. Time-prefixed so codes sort roughly by recency; 2 random chars avoid
// collisions within the same millisecond.
export const genOrderNo = (): string => {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.random().toString(36).toUpperCase().slice(2, 4).padEnd(2, "X");
  return `MH-${t}${r}`;
};

export interface StoreSaleItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  category: string;
  productImageUrl: ImageT[];
  costAtSale?: number; // unit cost snapshot — profit is computed from this, frozen at sale time
  ikpu?: string;       // fiscal code snapshot (so a POS sale can produce a compliant ChEK later)
  vatRate?: number;    // VAT % snapshot
}
export interface StoreSaleInput {
  basketItems: StoreSaleItem[];
  totalPrice: number;       // final total AFTER discount
  totalQuantity: number;
  discount?: number;        // discount applied at the till (UZS off the subtotal)
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  cashierUid: string;
  cashierName?: string;
  paymentMethod: string;
}

interface StoreState {
  orders: Order[];
  currentOrder: Order | null;
  loadingOrders: boolean;
  addOrder: (order: Order) => Promise<void>;
  addStoreSale: (sale: StoreSaleInput) => Promise<{ id: string; orderNo: string }>;
  fetchAllOrders: () => void;
  updateOrderStatus: (id: string, status: OrderStatus, actor?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  deleteAllOrders: () => Promise<number>;
  /** Period-scoped report reset: delete orders whose date ∈ [fromMs, toMs). */
  deleteOrdersInRange: (fromMs: number, toMs: number) => Promise<number>;
}

// Shared, app-wide live orders listener (module-scoped) — subscribe once instead
// of opening a fresh onSnapshot on every component that calls fetchAllOrders().
let ordersUnsub: (() => void) | null = null;

export const useOrderStore = create<StoreState>((set, get) => ({
  orders: [],
  currentOrder: null,
  loadingOrders: true,

  // Add a new order to Firestore and update the state. Every order starts in
  // the "yangi" (new) state so the fulfillment pipeline + filter tabs work.
  addOrder: async (order: Order) => {
    try {
      const ordersCollectionRef = collection(fireDB, "orders");
      // stockApplied:false — a web order does NOT touch stock at placement; it
      // decrements later, once on the first commit transition (see updateOrderStatus).
      const orderNo = order.orderNo || genOrderNo();
      const docRef = await addDoc(ordersCollectionRef, {
        ...order,
        orderNo,
        status: order.status || DEFAULT_ORDER_STATUS,
        stockApplied: false,
        date: new Date(),
      });
      set((state) => {
        const newOrder = { ...order, orderNo, status: order.status || DEFAULT_ORDER_STATUS, stockApplied: false, id: docRef.id };
        return { orders: [...state.orders, newOrder] };
      });
    } catch (error) {
      console.error("Error adding order to Firebase: ", error);
      throw error; // let the checkout surface a failure instead of silently "succeeding"
    }
  },

  // Fetch all orders from Firestore and update the state
  fetchAllOrders: () => {
    if (ordersUnsub) return; // reuse the one shared subscription
    set({ loadingOrders: true });
    // Newest-first + capped — see ORDER_FETCH_LIMIT. orderBy is safe: every
    // order is written with a `date` Timestamp.
    const q = query(collection(fireDB, "orders"), orderBy("date", "desc"), limit(ORDER_FETCH_LIMIT));
    ordersUnsub = onSnapshot(
      q,
      (QuerySnapshot) => {
        const OrderArray: Order[] = [];
        QuerySnapshot.forEach((d) => {
          OrderArray.push({ ...(d.data() as Order), id: d.id });
        });
        set({ orders: OrderArray, loadingOrders: false });
      },
      (err) => {
        // Surface read failures instead of hanging on the loader forever
        // (e.g. a non-admin session, or rules denying the read).
        console.error("Orders subscription error:", err);
        set({ loadingOrders: false });
      }
    );
  },

  // Move an order along the fulfillment pipeline (admin action). Single-field
  // updateDoc — the onSnapshot subscription live-refreshes the list for everyone.
  updateOrderStatus: async (id: string, status: OrderStatus, actor?: string) => {
    const order = get().orders.find((o) => o.id === id);
    const base: Record<string, FieldValue | string | boolean> = { status, lastChangedAt: serverTimestamp() };
    if (actor) base.lastChangedBy = actor;

    // Stock hook (WEB orders only — POS sales already decremented at sale time):
    //  • APPLY once on the first commit transition (yangi → tasdiqlangan/…),
    //    decrementing each line's on-hand stock. Guarded by stockApplied so a
    //    later forward step (e.g. → yetkazildi) never double-counts.
    //  • RESTORE once if a committed order is cancelled (→ bekor).
    // basketItems carry the ORDERED quantity per line (cart semantics) + product id.
    const isWeb = !order || order.channel !== "store";
    const lines = (order?.basketItems ?? []).filter((l) => l?.id && (l.quantity ?? 0) > 0);
    // APPLY (decrement) is web-only — POS sales already decremented at the till.
    const willApply = isWeb && order?.stockApplied !== true && isStockCommitting(status) && lines.length > 0;
    // RESTORE (re-stock) covers cancellation AND returns, for BOTH channels —
    // a returned counter (POS) sale must put goods back on the shelf too.
    const willRestore =
      order?.stockApplied === true &&
      (status === "bekor" || status === "qaytarildi") &&
      lines.length > 0;

    let appliedNow = false;
    let restoredNow = false;
    try {
      if (willApply || willRestore) {
        const sign = willApply ? -1 : 1;
        const batch = writeBatch(fireDB);
        batch.update(doc(fireDB, "orders", id), { ...base, stockApplied: willApply });
        for (const l of lines) {
          batch.update(doc(fireDB, "products", l.id), { quantity: increment(sign * l.quantity) });
          // Mirror the move into the stock ledger: sotuv on fulfill, qaytarish on return.
          batch.set(doc(collection(fireDB, "stockMovements")), {
            productId: l.id,
            productTitle: l.title ?? "",
            type: willApply ? "sotuv" : "qaytarish",
            delta: sign * l.quantity,
            reason: willApply ? "Sotuv (buyurtma)" : "Qaytarildi",
            orderNo: order?.orderNo ?? "",
            actorUid: "",
            actorName: actor ?? "",
            createdAt: serverTimestamp(),
          });
        }
        try {
          await batch.commit();
          appliedNow = willApply;
          restoredNow = willRestore;
        } catch (stockErr) {
          // Restoring stock needs manager+ (rules forbid staff RAISING quantity),
          // and a line's product may have been deleted. Never block the status
          // change on a stock hiccup — fall back to a status-only update so the
          // owner/admin can correct stock by hand (the Stock field is editable).
          console.warn("Stock adjustment skipped; applying status only:", stockErr);
          await updateDoc(doc(fireDB, "orders", id), base);
        }
      } else {
        await updateDoc(doc(fireDB, "orders", id), base);
      }
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === id
            ? {
                ...o,
                status,
                lastChangedBy: actor ?? o.lastChangedBy,
                stockApplied: appliedNow ? true : restoredNow ? false : o.stockApplied,
              }
            : o
        ),
      }));
    } catch (error) {
      console.error("Error updating order status: ", error);
      throw error;
    }
  },

  // Record a completed in-store (POS) sale AND decrement stock, atomically.
  // channel:"store" + status:"sotildi" are pinned (validated by the create
  // rule); each line decrements products.quantity (staff may only lower it).
  addStoreSale: async (sale: StoreSaleInput) => {
    const batch = writeBatch(fireDB);
    const orderRef = doc(collection(fireDB, "orders"));
    const orderNo = genOrderNo();
    // stockApplied:true — the decrement happens HERE atomically, so the
    // fulfillment hook never double-applies a POS sale.
    batch.set(orderRef, { ...sale, orderNo, channel: "store", status: "sotildi", stockApplied: true, date: new Date() });
    for (const item of sale.basketItems) {
      batch.update(doc(fireDB, "products", item.id), { quantity: increment(-item.quantity) });
      // Auto-log the sale into the stock ledger (a "sotuv" row per line).
      batch.set(doc(collection(fireDB, "stockMovements")), {
        productId: item.id,
        productTitle: item.title ?? "",
        type: "sotuv",
        delta: -item.quantity,
        reason: "Doʼkon sotuvi",
        orderNo,
        actorUid: sale.cashierUid ?? "",
        actorName: sale.cashierName ?? "",
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return { id: orderRef.id, orderNo };
  },

  // Remove an order (admin+ only — e.g. spam or a test order).
  deleteOrder: async (id: string) => {
    await deleteDoc(doc(fireDB, "orders", id));
    set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
  },

  // Wipe EVERY order — i.e. reset all sales reports/analytics to zero. Reads the
  // full collection (not the capped live query) so nothing is left behind, then
  // deletes in ≤400-doc batches (Firestore's per-batch limit). Owner-only +
  // type-to-confirm gated in the UI; rules enforce the real boundary. Returns
  // how many orders were removed. NOTE: this does NOT restock products — it only
  // clears the sales history the reports are built from.
  deleteAllOrders: async () => {
    const snap = await getDocs(collection(fireDB, "orders"));
    const ids = snap.docs.map((d) => d.id);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(fireDB);
      for (const id of ids.slice(i, i + 400)) batch.delete(doc(fireDB, "orders", id));
      await batch.commit();
    }
    set({ orders: [] });
    return ids.length;
  },

  // Period-scoped tozalash for the analytics danger zone: removes ONLY the
  // window's orders (web + kassa), so other periods' history and reports
  // survive. Same range semantics as the reports themselves ([from, to) on
  // the order's `date`), same ≤400-doc batching and admin+ rules gate as
  // deleteAllOrders. Like the full wipe, it does NOT restock products, and
  // the stockMovements ledger stays — it's append-only audit history (rules
  // forbid deleting it).
  deleteOrdersInRange: async (fromMs, toMs) => {
    const snap = await getDocs(
      query(
        collection(fireDB, "orders"),
        where("date", ">=", Timestamp.fromMillis(fromMs)),
        where("date", "<", Timestamp.fromMillis(toMs))
      )
    );
    const ids = snap.docs.map((d) => d.id);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(fireDB);
      for (const id of ids.slice(i, i + 400)) batch.delete(doc(fireDB, "orders", id));
      await batch.commit();
    }
    // The live listener also catches up; prune immediately so on-screen
    // KPIs/charts match the success toast without a refresh beat.
    const gone = new Set(ids);
    set((state) => ({ orders: state.orders.filter((o) => !gone.has(o.id)) }));
    return ids.length;
  },
}));
