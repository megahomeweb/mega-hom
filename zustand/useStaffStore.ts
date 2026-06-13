import { create } from "zustand";
import { collection, doc, onSnapshot, query, updateDoc } from "firebase/firestore";
import { fireDB } from "@/firebase/FirebaseConfig";
import { userT } from "@/lib/types";

export interface StaffUser extends userT {
  id: string; // doc id (== uid for migrated accounts)
  disabled?: boolean;
}

interface StaffStoreState {
  staff: StaffUser[];
  loading: boolean;
  fetchStaff: () => void;
  setRole: (id: string, role: string) => Promise<void>;
  setDisabled: (id: string, disabled: boolean) => Promise<void>;
}

const useStaffStore = create<StaffStoreState>((set) => {
  let started = false;
  return {
    staff: [],
    loading: true,
    fetchStaff: () => {
      if (started) return;
      started = true;
      set({ loading: true });
      onSnapshot(
        query(collection(fireDB, "user")),
        (snap) => {
          const list: StaffUser[] = snap.docs.map((d) => {
            const data = d.data() as userT & { disabled?: boolean };
            return { ...data, id: d.id, disabled: data.disabled };
          });
          set({ staff: list, loading: false });
        },
        (err) => {
          console.error("staff subscription failed", err);
          set({ loading: false });
        }
      );
    },
    setRole: async (id, role) => {
      await updateDoc(doc(fireDB, "user", id), { role });
    },
    setDisabled: async (id, disabled) => {
      await updateDoc(doc(fireDB, "user", id), { disabled });
    },
  };
});

export default useStaffStore;
