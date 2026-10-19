import { Link } from 'react-router-dom';
import { selectProductCount, useCartStore } from '@/features/carrito/cart-store';
import { CartIcon } from '@/components/icons/cart-icon';

export function CartLink() {
  const count = useCartStore(selectProductCount);
  const label = count === 0 ? 'Carrito' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`;

  return (
    <Link
      to="/cart"
      aria-label={label}
      className="relative inline-flex h-12 w-12 items-center justify-center rounded-md text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
    >
      <CartIcon className="h-6 w-6" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1 text-xs leading-none font-bold text-on-action"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
