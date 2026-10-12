import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { z } from 'zod';
import { MAX_PRODUCTS, MAX_QUANTITY, type CartItem } from '@/features/carrito/share-code';

export const CART_STORAGE_KEY = 'salazar.carrito';

export interface Purchasable {
  id: number;
  name: string;
  available: boolean;
  stock: number;
}

interface CartState {
  items: CartItem[];
  // Transient: drives the "added" notice and is never persisted
  lastAdded: { productId: number; name: string; at: number } | null;
  add: (product: Purchasable) => void;
  importItems: (incoming: CartItem[]) => void;
  reconcile: (requestedIds: number[], products: { id: number; stock: number }[]) => void;
  clear: () => void;
}

const itemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

function parseItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const items: CartItem[] = [];
  for (const candidate of value) {
    const parsed = itemSchema.safeParse(candidate);
    if (!parsed.success || seen.has(parsed.data.productId)) continue;
    seen.add(parsed.data.productId);
    items.push(parsed.data);
  }
  return items.slice(0, MAX_PRODUCTS);
}

// Storage can be blocked or full (private mode); the cart then lives in memory only
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // keep working in memory
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // keep working in memory
    }
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      lastAdded: null,
      add: (product) =>
        set((state) => {
          if (!product.available) return state;
          const current = state.items.find((item) => item.productId === product.id);
          const quantity = current?.quantity ?? 0;
          if (quantity >= product.stock || state.items.length >= MAX_PRODUCTS) return state;
          const items = current
            ? state.items.map((item) => (item.productId === product.id ? { ...item, quantity: quantity + 1 } : item))
            : [...state.items, { productId: product.id, quantity: 1 }];
          return {
            items,
            lastAdded: {
              productId: product.id,
              name: product.name,
              at: Date.now(),
            },
          };
        }),
      importItems: (incoming) =>
        set((state) => {
          const byId = new Map(state.items.map((item) => [item.productId, item]));
          for (const item of incoming) {
            if (byId.has(item.productId) || byId.size < MAX_PRODUCTS) byId.set(item.productId, item);
          }
          return { items: [...byId.values()] };
        }),
      reconcile: (requestedIds, products) =>
        set((state) => {
          const requested = new Set(requestedIds);
          const stockById = new Map(products.map((product) => [product.id, product.stock]));
          const items = state.items
            .filter((item) => !requested.has(item.productId) || stockById.has(item.productId))
            .map((item) => {
              const stock = stockById.get(item.productId);
              // An empty dish keeps its quantity: it is shown as sold out and the customer decides
              return stock !== undefined && stock > 0 && item.quantity > stock ? { ...item, quantity: stock } : item;
            });
          const unchanged = items.length === state.items.length && items.every((item, i) => item === state.items[i]);
          return unchanged ? state : { items };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ items: state.items }),
      // Anything unreadable (including the old array-shaped value under the same key) starts an empty cart
      merge: (persisted, current) => ({
        ...current,
        items: parseItems((persisted as { items?: unknown } | undefined)?.items),
      }),
    },
  ),
);

export const selectProductCount = (state: CartState) => state.items.length;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) void useCartStore.persist.rehydrate();
  });
}
