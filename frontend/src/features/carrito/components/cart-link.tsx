import { Link } from 'react-router-dom';
import { selectProductCount, useCartStore } from '@/features/carrito/cart-store';

export function CartLink() {
  const count = useCartStore(selectProductCount);
  const label = count === 0 ? 'Carrito' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`;

  return (
    <Link
      to="/cart"
      aria-label={label}
      className="relative inline-flex h-12 w-12 items-center justify-center rounded-md text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6 fill-none stroke-current"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
      </svg>
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
