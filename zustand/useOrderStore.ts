import {create} from "zustand";
import { collection, deleteDoc, doc, addDoc, increment, query, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { ImageT, Order } from "@/lib/types";
import { DEFAULT_ORDER_STATUS, OrderStatus } from "@/lib/orderStatus";

export interface StoreSaleItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  category: string;
  productImageUrl: ImageT[];
}
export interface StoreSaleInput {
  basketItems: StoreSaleItem[];
  totalPrice: number;
  totalQuantity: number;
  clientName: string;
  clientLastName: string;
  clientPhone: string;
  cashierUid: string;
  paymentMethod: string;
}

interface StoreState {
  orders: Order[];
  currentOrder: Order | null;
  loadingOrders: boolean;
  addOrder: (order: Order) => Promise<void>;
  addStoreSale: (sale: StoreSaleInput) => Promise<void>;
  fetchAllOrders: () => void;
  updateOrderStatus: (id: string, status: OrderStatus, actor?: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

export const useOrderStore = create<StoreState>((set) => ({
  orders: [],
  currentOrder: null,
  loadingOrders: true,

  // Add a new order to Firestore and update the state. Every order starts in
  // the "yangi" (new) state so the fulfillment pipeline + filter tabs work.
  addOrder: async (order: Order) => {
    try {
      const ordersCollectionRef = collection(fireDB, "orders");
      const docRef = await addDoc(ordersCollectionRef, {
        ...order,
        status: DEFAULT_ORDER_STATUS,
        date: new Date(),
      });
      set((state) => {
        const newOrder = { ...order, status: DEFAULT_ORDER_STATUS, id: docRef.id };
        return { orders: [...state.orders, newOrder] };
      });
    } catch (error) {
      console.error("Error adding order to Firebase: ", error);
      throw error; // let the checkout surface a failure instead of silently "succeeding"
    }
  },

  // Fetch all orders from Firestore and update the state
  fetchAllOrders: async () => {
    set({ loadingOrders: true });
    try {
      const q = query(collection(fireDB, "orders"));
      const unsubscribe = onSnapshot(
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
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching orders: ", error);
      set({ loadingOrders: false });
    }
  },

  // Move an order along the fulfillment pipeline (admin action). Single-field
  // updateDoc — the onSnapshot subscription live-refreshes the list for everyone.
  updateOrderStatus: async (id: string, status: OrderStatus, actor?: string) => {
    try {
      await updateDoc(
        doc(fireDB, "orders", id),
        actor
          ? { status, lastChangedBy: actor, lastChangedAt: serverTimestamp() }
          : { status, lastChangedAt: serverTimestamp() }
      );
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? { ...o, status, lastChangedBy: actor ?? o.lastChangedBy } : o)),
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
    batch.set(orderRef, { ...sale, channel: "store", status: "sotildi", date: new Date() });
    for (const item of sale.basketItems) {
      batch.update(doc(fireDB, "products", item.id), { quantity: increment(-item.quantity) });
    }
    await batch.commit();
  },

  // Remove an order (admin+ only — e.g. spam or a test order).
  deleteOrder: async (id: string) => {
    await deleteDoc(doc(fireDB, "orders", id));
    set((state) => ({ orders: state.orders.filter((o) => o.id !== id) }));
  },
}));
