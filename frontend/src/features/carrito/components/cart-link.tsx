import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { selectProductCount, useCartStore } from '@/features/carrito/cart-store';
import { CartPopover } from '@/features/carrito/components/cart-popover';
import { CartIcon } from '@/components/icons/cart-icon';

const CLOSE_DELAY_MS = 150;

export function CartLink() {
  const count = useCartStore(selectProductCount);
  const { pathname } = useLocation();
  // Remembering where it was opened closes the card by itself when the route changes
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (next: boolean) => setOpenAt(next ? pathname : null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const returningFocus = useRef(false);
  const label = count === 0 ? 'Carrito' : `Carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`;
  // The cart is already on screen in these routes and the card would cover it
  const hasCard = pathname !== '/cart' && !pathname.startsWith('/checkout');

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function openCard() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    // A tap focuses the link too; only keyboard focus opens the card so touch behaves as before
    if (!returningFocus.current && event.target.matches(':focus-visible')) openCard();
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
  }

  const link = (
    <Link
      ref={linkRef}
      to="/cart"
      aria-label={label}
      aria-expanded={hasCard ? open : undefined}
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

  if (!hasCard) return link;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openCard}
      onMouseLeave={closeSoon}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        setOpen(false);
        // Giving the focus back must not reopen the card it just closed
        returningFocus.current = true;
        linkRef.current?.focus();
        returningFocus.current = false;
      }}
    >
      {link}
      {open ? (
        // The padding bridges the gap to the icon so the pointer never leaves the container on the way down
        <div className="absolute top-full right-0 z-20 w-96 max-w-[calc(100vw-3rem)] pt-2">
          <CartPopover />
        </div>
      ) : null}
    </div>
  );
}
