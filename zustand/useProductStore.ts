import { fireDB } from '@/firebase/FirebaseConfig';
import { ProductT } from '@/lib/types';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import {create} from 'zustand';

const FIRESTORE_BATCH_LIMIT = 400;

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

const useProductStore = create<ProductStore>((set) => ({
  products: [],
  product: null,
  loading: false,

  // Fetch all products
  fetchProducts: async () => {
    set({ loading: true });
    try {
      const q = query(collection(fireDB, "products"), orderBy("time"));
      const unsubscribe = onSnapshot(q, (QuerySnapshot) => {
        let productArray: any = [];
        QuerySnapshot.forEach((doc) => {
          productArray.push({ ...doc.data(), id: doc.id });
        });
        set({ products: productArray, loading: false });
      });
      return () => unsubscribe(); 
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ loading: false });
    }
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
            productImageUrl: productData.productImageUrl,
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
        set({ loading: false });
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