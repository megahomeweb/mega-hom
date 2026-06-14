import { create } from "zustand";
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { Supplier } from "@/lib/types";

interface SupplierState {
  suppliers: Supplier[];
  loading: boolean;
  fetchSuppliers: () => void;
  addSupplier: (s: { name: string; phone?: string; note?: string }) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
}

const useSupplierStore = create<SupplierState>((set) => ({
  suppliers: [],
  loading: true,

  fetchSuppliers: () => {
    set({ loading: true });
    const q = query(collection(fireDB, "suppliers"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Supplier[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as Supplier), id: d.id }));
        set({ suppliers: list, loading: false });
      },
      (err) => {
        console.error("suppliers subscription error:", err);
        set({ loading: false });
      }
    );
    return () => unsub();
  },

  addSupplier: async ({ name, phone, note }) => {
    await addDoc(collection(fireDB, "suppliers"), {
      name: name.trim(),
      phone: phone?.trim() || "",
      note: note?.trim() || "",
      createdAt: new Date(),
    });
  },

  deleteSupplier: async (id) => {
    await deleteDoc(doc(fireDB, "suppliers", id));
  },
}));

export default useSupplierStore;
