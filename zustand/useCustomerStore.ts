import { create } from "zustand";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { CustomerT, Order } from "@/lib/types";
import { formatPhone, normalizePhone } from "@/utils/phone";

// Enrichment stored in the `customers` collection (doc.id = normalized phone).
// Order metrics are NEVER stored here — they're recomputed from `orders`.
interface Enrichment {
  name?: string;
  city?: string;
  tags?: string[];
  note?: string;
}

interface CustomerStoreState {
  customers: CustomerT[];
  loading: boolean;
  fetchCustomers: () => void;
  upsertEnrichment: (phone: string, patch: Enrichment) => Promise<void>;
}

const useCustomerStore = create<CustomerStoreState>((set) => {
  let rawOrders: Order[] = [];
  let enrich: Record<string, Enrichment> = {};
  let started = false;

  const recompute = () => {
    const map = new Map<string, CustomerT>();
    for (const o of rawOrders) {
      const norm = normalizePhone(o.clientPhone);
      const phone = norm || "no-phone";
      const ts =
        o.date && typeof o.date.seconds === "number" ? o.date.seconds * 1000 : null;
      let c = map.get(phone);
      if (!c) {
        c = {
          phone,
          displayPhone: norm ? formatPhone(o.clientPhone) : "Telefonsiz",
          name: "",
          orderCount: 0,
          totalSpent: 0,
          totalItems: 0,
          avgTicket: 0,
          firstOrderAt: null,
          lastOrderAt: null,
          orders: [],
          tags: [],
          note: "",
          city: "",
        };
        map.set(phone, c);
      }
      c.orderCount++;
      c.totalSpent += Number(o.totalPrice) || 0;
      c.totalItems += Number(o.totalQuantity) || 0;
      c.orders.push(o);
      const fullName = `${o.clientName ?? ""} ${o.clientLastName ?? ""}`.trim();
      if (ts != null) {
        if (c.lastOrderAt == null || ts >= c.lastOrderAt) {
          c.lastOrderAt = ts;
          c.name = fullName; // name from the most recent order
        }
        if (c.firstOrderAt == null || ts < c.firstOrderAt) c.firstOrderAt = ts;
      } else if (!c.name) {
        c.name = fullName;
      }
    }

    const list = [...map.values()];
    for (const c of list) {
      c.avgTicket = c.orderCount ? Math.round(c.totalSpent / c.orderCount) : 0;
      c.orders.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
      const e = enrich[c.phone];
      if (e) {
        if (e.tags) c.tags = e.tags;
        if (e.note) c.note = e.note;
        if (e.city) c.city = e.city;
        if (e.name) c.name = e.name; // admin-set name overrides
      }
    }
    list.sort((a, b) => (b.lastOrderAt ?? 0) - (a.lastOrderAt ?? 0));
    set({ customers: list, loading: false });
  };

  return {
    customers: [],
    loading: true,
    fetchCustomers: () => {
      if (started) return; // one set of subscriptions for the whole app
      started = true;
      set({ loading: true });
      onSnapshot(
        query(collection(fireDB, "orders")),
        (snap) => {
          rawOrders = snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
          recompute();
        },
        (err) => {
          console.error("customers: orders subscription failed", err);
          set({ loading: false });
        }
      );
      onSnapshot(
        query(collection(fireDB, "customers")),
        (snap) => {
          enrich = {};
          snap.forEach((d) => (enrich[d.id] = d.data() as Enrichment));
          recompute();
        },
        (err) => console.error("customers: enrichment subscription failed", err)
      );
    },
    upsertEnrichment: async (phone, patch) => {
      await setDoc(
        doc(fireDB, "customers", phone),
        { ...patch, phone, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
  };
});

export default useCustomerStore;
