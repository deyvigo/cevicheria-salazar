import { quantityCap, useCartStore } from '@/features/carrito/cart-store';

export interface AddableProduct {
  id: number;
  name: string;
  // null while the server hasn't confirmed it (detail opened directly)
  available: boolean | null;
  stock: number | null;
}

export function useAddToCart(product: AddableProduct | null) {
  const quantity = useCartStore((state) => state.items.find((item) => item.productId === product?.id)?.quantity ?? 0);
  const add = useCartStore((state) => state.add);

  const known = product !== null && product.available === true && product.stock !== null;
  const atLimit = known && quantity >= product.stock!;
  const canAdd = known && !atLimit;
  const cap = known ? quantityCap({ available: true, stock: product.stock! }, quantity) : quantity;

  return {
    quantity,
    cap,
    canAdd,
    atLimit,
    add: (amount = 1) => {
      if (canAdd)
        add(
          {
            id: product.id,
            name: product.name,
            available: true,
            stock: product.stock!,
          },
          amount,
        );
    },
  };
}
