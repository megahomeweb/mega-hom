import { ProductT } from '@/lib/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BasketState {
  cartProducts: ProductT[];
  cartProduct: ProductT | null;
  load: boolean;
  totalQuantity: number;
  totalPrice: number;
  addToBasket: (product: ProductT) => void;
  incrementQuantity: (id: string) => void;
  decrementQuantity: (id: string) => void;
  removeFromBasket: (id: string) => void;
  getItemQuantity: (id: string) => number;
  calculateTotals: () => void;
  clearBasket: () => void;
}

// Totals are a PURE function of the basket lines — always derived, never trusted
// from persisted storage. (Previously totals were persisted but only recomputed
// on +/- presses, so a page reload could submit a stale/wrong total to the order.)
const totalsOf = (cartProducts: ProductT[]) => ({
  totalQuantity: cartProducts.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0),
  totalPrice: cartProducts.reduce(
    (acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  ),
});

const useCartProductStore = create<BasketState>()(
  persist(
    (set, get) => ({
      cartProducts: [],
      cartProduct: null,
      load: false,
      totalQuantity: 0,
      totalPrice: 0,

      addToBasket: (product) =>
        set((state) => {
          const exists = state.cartProducts.some((item) => item.id === product.id);
          const cartProducts = exists
            ? state.cartProducts.map((item) =>
                item.id === product.id ? { ...item, quantity: product.quantity } : item
              )
            : [...state.cartProducts, { ...product }];
          return { cartProducts, ...totalsOf(cartProducts) };
        }),

      incrementQuantity: (id) =>
        set((state) => {
          const cartProducts = state.cartProducts.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item
          );
          return { cartProducts, ...totalsOf(cartProducts) };
        }),

      decrementQuantity: (id) =>
        set((state) => {
          // Drop the line when it would hit 0 (matches the old behaviour).
          const cartProducts = state.cartProducts.flatMap((item) => {
            if (item.id !== id) return [item];
            return item.quantity <= 1 ? [] : [{ ...item, quantity: item.quantity - 1 }];
          });
          return { cartProducts, ...totalsOf(cartProducts) };
        }),

      removeFromBasket: (id) =>
        set((state) => {
          const cartProducts = state.cartProducts.filter((item) => item.id !== id);
          return { cartProducts, ...totalsOf(cartProducts) };
        }),

      // 0 when the item isn't in the cart. (It used to return 1, which corrupted
      // cart math and seeded the product page's quantity stepper wrongly.)
      getItemQuantity: (id) => get().cartProducts.find((item) => item.id === id)?.quantity ?? 0,

      // Kept for back-compat; every mutation above already recomputes totals.
      calculateTotals: () => set((state) => totalsOf(state.cartProducts)),

      clearBasket: () => set({ cartProducts: [], totalQuantity: 0, totalPrice: 0 }),
    }),
    {
      name: 'basket-storage',
      // Persist ONLY the lines; totals are re-derived on rehydrate so a stale
      // persisted total can never reach checkout.
      partialize: (state) => ({ cartProducts: state.cartProducts }),
      onRehydrateStorage: () => (state) => {
        if (state) Object.assign(state, totalsOf(state.cartProducts));
      },
    }
  )
);
export default useCartProductStore;
