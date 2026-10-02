import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface CartItem {
  platoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  nota?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (platoId: number) => void;
  clear: () => void;
}

const STORAGE_KEY = 'salazar.carrito';

const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Carrito persistido en localStorage: no requiere cuenta (HU-16) y se conserva
 * al iniciar sesión o registrarse (HU-35). La lógica de cantidades, notas y
 * totales se completa en la épica E3 (carrito); esto es la forma base del estado.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage no disponible (modo privado, etc.): el carrito sigue funcionando en memoria.
    }
  }, [items]);

  function addItem(item: CartItem) {
    setItems((current) => [...current, item]);
  }

  function removeItem(platoId: number) {
    setItems((current) => current.filter((item) => item.platoId !== platoId));
  }

  function clear() {
    setItems([]);
  }

  return <CartContext.Provider value={{ items, addItem, removeItem, clear }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de un CartProvider.');
  }
  return context;
}
