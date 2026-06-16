import { create } from "zustand";
import {
  collection,
  doc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { ProductT, StockMovement, StockMovementType } from "@/lib/types";

export interface MovementInput {
  product: ProductT;
  type: StockMovementType; // kirim (+), chiqim (−), tuzatish (set)
  qty: number;             // positive magnitude entered by the user
  reason: string;
  supplierName?: string;   // kirim: which supplier supplied the goods
  actorUid: string;
  actorName: string;
}

interface StockState {
  movements: StockMovement[];
  loading: boolean;
  fetchMovements: () => void;
  applyMovement: (input: MovementInput) => Promise<void>;
}

// Shared, app-wide live ledger listener (module-scoped) — one subscription.
let movementsUnsub: (() => void) | null = null;

const useStockStore = create<StockState>((set) => ({
  movements: [],
  loading: true,

  // Live ledger, newest first (capped so the page never loads the whole history).
  fetchMovements: () => {
    if (movementsUnsub) return; // reuse the one shared subscription
    set({ loading: true });
    const q = query(collection(fireDB, "stockMovements"), orderBy("createdAt", "desc"), limit(300));
    movementsUnsub = onSnapshot(
      q,
      (snap) => {
        const list: StockMovement[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as StockMovement), id: d.id }));
        set({ movements: list, loading: false });
      },
      (err) => {
        console.error("stockMovements subscription error:", err);
        set({ loading: false });
      }
    );
  },

  // Atomically move stock AND append the ledger row, so on-hand and its history
  // can never drift apart. kirim adds, chiqim subtracts (floored at 0),
  // tuzatish sets the absolute counted quantity.
  applyMovement: async ({ product, type, qty, reason, supplierName, actorUid, actorName }) => {
    const current = Number(product.quantity) || 0;
    const magnitude = Math.abs(Number(qty) || 0);
    let newQty = current;
    if (type === "kirim") newQty = current + magnitude;
    else if (type === "chiqim") newQty = Math.max(0, current - magnitude);
    else if (type === "tuzatish") newQty = magnitude;
    const delta = newQty - current;

    const batch = writeBatch(fireDB);
    batch.update(doc(fireDB, "products", product.id), { quantity: newQty });
    batch.set(doc(collection(fireDB, "stockMovements")), {
      productId: product.id,
      productTitle: product.title ?? "",
      type,
      delta,
      newQty,
      reason: reason.trim(),
      supplierName: type === "kirim" ? supplierName?.trim() || "" : "",
      actorUid,
      actorName,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  },
}));

export default useStockStore;
