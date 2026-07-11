import { fireDB } from '@/firebase/FirebaseConfig';
import { ImageT, ProductT } from '@/lib/types';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import {create} from 'zustand';

const FIRESTORE_BATCH_LIMIT = 400;

/** Coerce Firestore image field into a clean ImageT[] (handles missing/malformed data). */
function normalizeImages(raw: unknown): ImageT[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string") {
        const url = x.trim();
        return url ? { url, path: "" } : null;
      }
      if (x && typeof x === "object") {
        const url = String((x as ImageT).url ?? "").trim();
        if (!url) return null;
        return { url, path: String((x as ImageT).path ?? "") };
      }
      return null;
    })
    .filter((im): im is ImageT => im !== null);
}

interface ProductStore {
  products: ProductT[];
  product: ProductT | null;
  loading: boolean;
  fetchProducts: () => void;
  fetchSingleProduct: (id: string) => Promise<void>;
  updateProduct: (id: string, updatedProduct: ProductT) => Promise<void>;
  patchProduct: (id: string, data: Partial<ProductT>) => Promise<void>;
  bulkPatch: (ids: string[], data: Partial<ProductT>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
}

// One shared realtime listener for the whole app (module-scoped). Without this,
// every component calling fetchProducts() on mount opened a NEW onSnapshot whose
// unsubscribe was discarded — leaking listeners + duplicate reads on each mount.
let productsUnsub: (() => void) | null = null;

const useProductStore = create<ProductStore>((set) => ({
  products: [],
  product: null,
  loading: false,

  // Subscribe once to the live products collection (idempotent — reuses the one
  // shared listener instead of opening a new one on every component mount).
  fetchProducts: () => {
    if (productsUnsub) return;
    set({ loading: true });
    const q = query(collection(fireDB, "products"), orderBy("time"));
    productsUnsub = onSnapshot(
      q,
      (QuerySnapshot) => {
        const productArray: ProductT[] = [];
        QuerySnapshot.forEach((doc) => {
          const data = doc.data() as ProductT;
          productArray.push({
            ...data,
            id: doc.id,
            productImageUrl: normalizeImages(data.productImageUrl),
          });
        });
        set({ products: productArray, loading: false });
      },
      (error) => {
        console.error("Error fetching products:", error);
        set({ loading: false });
      }
    );
  },

  // Fetch a single product by ID
  fetchSingleProduct: async (id: string) => {
    set({ loading: true });
    try {
      const productDoc = await getDoc(doc(fireDB, 'products', id));
      const productData = productDoc.data();
      
      if (productData) {
        set({
          product: {
            id, 
            title: productData.title,
            price: productData.price,
            costPrice: productData.costPrice,
            lowStockThreshold: productData.lowStockThreshold,
            productImageUrl: normalizeImages(productData.productImageUrl),
            category: productData.category,
            subCategory: productData.subCategory,
            description: productData.description,
            isBest: productData.isBest,
            isNew: productData.isNew,
            isHidden: productData.isHidden,
            ikpu: productData.ikpu,
            vatRate: productData.vatRate,
            barcode: productData.barcode,
            quantity: productData.quantity,
            time: productData.time,
            date: productData.date,
            storageFileId: productData.storageFileId
          } as ProductT,
          loading: false
        });
      } else {
        // Clear any stale product so the page can render a real "not found"
        // state instead of showing the previously-viewed product.
        set({ product: null, loading: false });
        console.error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      set({ loading: false });
    }
  },

  // Update a product. merge:true so a partial write (e.g. a future inline
  // single-field edit) can never blank the fields it didn't include.
  updateProduct: async (id: string, updatedProduct: ProductT) => {
    set({ loading: true });
    try {
      await setDoc(doc(fireDB, 'products', id), updatedProduct, { merge: true });
      set({ product: updatedProduct, loading: false });
    } catch (error) {
      console.error('Error updating product:', error);
      set({ loading: false });
    }
  },

  // Patch only specific fields (inline edits, flag/visibility toggles). Writes
  // ONLY the given fields — no risk of blanking others, no stale full-object.
  patchProduct: async (id, data) => {
    try {
      await setDoc(doc(fireDB, 'products', id), data as Record<string, unknown>, { merge: true });
    } catch (error) {
      console.error('Error patching product:', error);
      throw error;
    }
  },

  // Apply the same fields to many products in one batched write.
  bulkPatch: async (ids, data) => {
    for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = writeBatch(fireDB);
      for (const id of ids.slice(i, i + FIRESTORE_BATCH_LIMIT)) {
        batch.set(doc(fireDB, 'products', id), data as Record<string, unknown>, { merge: true });
      }
      await batch.commit();
    }
  },

  // Delete a product
  deleteProduct: async (productId) => {
    try {
      const productRef = doc(fireDB, 'products', productId);
      await deleteDoc(productRef);
      set((state) => ({
        products: state.products.filter(product => product.id !== productId)
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }
}));

export default useProductStore;