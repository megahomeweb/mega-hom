import {create} from "zustand";
import { collection, doc, addDoc, query, onSnapshot, updateDoc } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { Order } from "@/lib/types";
import { DEFAULT_ORDER_STATUS, OrderStatus } from "@/lib/orderStatus";

interface StoreState {
  orders: Order[];
  currentOrder: Order | null;
  loadingOrders: boolean;
  addOrder: (order: Order) => Promise<void>;
  fetchAllOrders: () => void;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
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
      const unsubscribe = onSnapshot(q, (QuerySnapshot) => {
        const OrderArray: Order[] = [];
        QuerySnapshot.forEach((d) => {
          OrderArray.push({ ...(d.data() as Order), id: d.id });
        });
        set({ orders: OrderArray, loadingOrders: false });
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching orders: ", error);
      set({ loadingOrders: false });
    }
  },

  // Move an order along the fulfillment pipeline (admin action). Single-field
  // updateDoc — the onSnapshot subscription live-refreshes the list for everyone.
  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(fireDB, "orders", id), { status });
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
      }));
    } catch (error) {
      console.error("Error updating order status: ", error);
      throw error;
    }
  },
}));
