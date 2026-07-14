import { create } from "zustand";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { CustomerT, Order, userT } from "@/lib/types";
import { formatPhone, normalizePhone } from "@/utils/phone";

// Enrichment stored in the `customers` collection (doc.id = normalized phone).
// Order metrics are NEVER stored here — they're recomputed from `orders`.
interface Enrichment {
  name?: string;
  email?: string;
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

const emptyCustomer = (phone: string, displayPhone: string): CustomerT => ({
  phone,
  displayPhone,
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
});

const tsMs = (t: unknown): number | null =>
  t && typeof (t as { seconds?: number }).seconds === "number"
    ? (t as { seconds: number }).seconds * 1000
    : null;

// Mijozlar = union of three sources keyed by normalized phone:
//   1. buyers aggregated from `orders` (the transaction history),
//   2. registered storefront accounts (`user` docs with role "user") — they are
//      customers from the moment they sign up, before any order; phoneless
//      accounts (old signups, Google) key as "user:<uid>" until a phone is known,
//   3. `customers` enrichment docs — including hand-added / CSV-imported people
//      with no orders yet, which previously never rendered at all.
const useCustomerStore = create<CustomerStoreState>((set) => {
  let rawOrders: Order[] = [];
  let enrich: Record<string, Enrichment> = {};
  let regUsers: (userT & { id: string })[] = [];
  let started = false;

  const recompute = () => {
    const map = new Map<string, CustomerT>();
    for (const o of rawOrders) {
      const norm = normalizePhone(o.clientPhone);
      const phone = norm || "no-phone";
      const ts = tsMs(o.date);
      let c = map.get(phone);
      if (!c) {
        c = emptyCustomer(phone, norm ? formatPhone(o.clientPhone) : "Telefonsiz");
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

    for (const u of regUsers) {
      const norm = normalizePhone(u.phone);
      const key = norm || `user:${u.id}`;
      let c = map.get(key);
      if (!c) {
        c = emptyCustomer(key, norm ? formatPhone(norm) : "Telefonsiz");
        map.set(key, c);
      }
      c.registered = true;
      c.uid = u.id;
      c.registeredAt = tsMs(u.createdAt) ?? tsMs(u.time);
      if (!c.name && u.name) c.name = u.name;
      if (!c.email && u.email) c.email = u.email;
    }

    for (const [phone, e] of Object.entries(enrich)) {
      let c = map.get(phone);
      if (!c) {
        c = emptyCustomer(phone, formatPhone(phone));
        map.set(phone, c);
      }
      if (e.tags) c.tags = e.tags;
      if (e.note) c.note = e.note;
      if (e.city) c.city = e.city;
      if (e.name) c.name = e.name; // admin-set values override
      if (e.email) c.email = e.email;
    }

    const list = [...map.values()];
    for (const c of list) {
      c.avgTicket = c.orderCount ? Math.round(c.totalSpent / c.orderCount) : 0;
      c.orders.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
    }
    // Most recent activity first: last order, else the signup moment.
    list.sort(
      (a, b) =>
        (b.lastOrderAt ?? b.registeredAt ?? 0) - (a.lastOrderAt ?? a.registeredAt ?? 0)
    );
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
      // Registered storefront accounts only — staff-tier docs are NOT customers.
      // (Rules allow this listing for manager+; for rank-1 POS staff it fails
      // quietly like the enrichment subscription and the list stays order-based.)
      onSnapshot(
        query(collection(fireDB, "user"), where("role", "==", "user")),
        (snap) => {
          regUsers = snap.docs.map((d) => ({ ...(d.data() as userT), id: d.id }));
          recompute();
        },
        (err) => console.error("customers: user subscription failed", err)
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
