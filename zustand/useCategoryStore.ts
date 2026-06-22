import { fireDB } from '@/firebase/FirebaseConfig';
import { CategoryI } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query } from 'firebase/firestore';
import {create} from 'zustand';

interface CategoryStoreI {
  categories: CategoryI[];
  category: CategoryI | null;
  loading: boolean;
  addCategory: (newCategory: CategoryI) => Promise<void>;
  fetchCategories: () => void;
  fetchSingleCategory: (id: string) => void
  deleteCategory: (categoryId: string) => void;
}

// One shared realtime listener for the whole app (module-scoped). Mirrors
// useProductStore — without this, every component calling fetchCategories() on
// mount opened a NEW onSnapshot whose unsubscribe was discarded (a listener leak
// that re-fired set({categories}) and re-rendered every consumer on each mount).
let categoriesUnsub: (() => void) | null = null;

const useCategoryStore = create<CategoryStoreI>((set) => ({
  categories: [],
  category: null,
  loading: false,
  // Add a new category
  addCategory: async (newCategory: CategoryI) => {
    set({ loading: true });
    try {
      const categoryDoc = collection(fireDB, 'categories');
      await addDoc(categoryDoc, newCategory);
      set({ loading: false });
    } catch (error) {
      console.error('Error adding category:', error);
      set({ loading: false });
    }
  },

  // fetch single category with id
  fetchSingleCategory: async (id) => {
    set({loading: true});
    try {
      const categoryDoc = await getDoc(doc(fireDB, 'categories', id));
      const categoryData = categoryDoc.data();

      if (categoryData) {
        set({
          category: {
            id, 
            name: categoryData.name,
            subcategory: categoryData.subcategory
          } as CategoryI,
          loading: false
        });
      } else {
        set({ loading: false });
        console.error('category not found');
      }
      
      
    } catch (error) {
      
    }
  },

  // Subscribe once to the live categories collection (idempotent — reuses the one
  // shared listener instead of opening a new one on every component mount). The
  // error callback releases the loading flag so a denied/failed read can't hang
  // the storefront nav on a spinner forever.
  fetchCategories: () => {
    if (categoriesUnsub) return;
    set({ loading: true });
    const q = query(collection(fireDB, "categories"));
    categoriesUnsub = onSnapshot(
      q,
      (QuerySnapshot) => {
        const CategoryArray: CategoryI[] = [];
        QuerySnapshot.forEach((doc) => {
          CategoryArray.push({ ...(doc.data() as CategoryI), id: doc.id });
        });
        set({ categories: CategoryArray, loading: false });
      },
      (error) => {
        console.error("Error fetching categories:", error);
        set({ loading: false });
      }
    );
  },

  // delete category with id
  deleteCategory: async (categoryId) => {
    try {
      const categoryRef = doc(fireDB, 'categories', categoryId);
      await deleteDoc(categoryRef);
      set((state) => ({
        categories: state.categories.filter(category => category.id !== categoryId)
      }));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  }
}))

export default useCategoryStore;