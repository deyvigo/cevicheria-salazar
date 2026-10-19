import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useViewTransitionState } from 'react-router-dom';
import { Button } from '@/components/button';
import { QuantityStepper } from '@/features/carrito/components/quantity-stepper';
import { quantityCap, useCartStore } from '@/features/carrito/cart-store';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { AvailabilityBadge } from '@/features/catalogo/components/availability-badge';
import { formatPrice } from '@/features/catalogo/format';
import { rememberScroll } from '@/features/catalogo/scroll-memory';
import { sharedName } from '@/features/catalogo/transition-names';
import type { Product } from '@/features/catalogo/catalog-api';
import { TrashIcon } from '@/components/icons/trash-icon';

const FADE_OUT_MS = 250;

export function CartItemRow({
  product,
  quantity,
  onRemoved,
}: {
  product: Product;
  quantity: number;
  onRemoved?: () => void;
}) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const purchasable = {
    id: product.id,
    name: product.name,
    available: product.available,
    stock: product.stock,
  };

  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(next: number) {
    if (leaving) return;
    if (next <= 0) {
      const finish = () => {
        remove(product.id, product.name);
        onRemoved?.();
      };
      // Wait for the fade so the row doesn't vanish abruptly; with reduced motion there is no fade to wait for
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        finish();
      } else {
        setLeaving(true);
        timer.current = setTimeout(finish, FADE_OUT_MS);
      }
    } else {
      setQuantity(purchasable, next);
    }
  }

  const location = useLocation();
  const to = `/products/${product.id}`;
  // Only the row involved in the navigation gets the shared names, so they never repeat in the list
  const transitioning = useViewTransitionState(to);
  const linkProps = {
    to,
    state: { from: location.pathname },
    viewTransition: true,
    onClick: () => rememberScroll(location.pathname, window.scrollY),
  };

  return (
    <li
      className={`flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-opacity duration-250 ease-out ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      {/* The name link is the accessible one; the image link only widens the click target */}
      <Link {...linkProps} tabIndex={-1} aria-hidden="true" className="flex-none">
        <DishImage
          src={product.imageUrl}
          alt={product.name}
          style={sharedName('image', transitioning)}
          className="h-20 w-20 rounded-md bg-surface-celeste object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          {...linkProps}
          style={sharedName('name', transitioning)}
          className="w-fit rounded-sm font-display text-[18px] leading-6 font-semibold text-ink hover:underline focus-visible:shadow-focus focus-visible:outline-none"
        >
          {product.name}
        </Link>
        <span style={sharedName('price', transitioning)} className="w-fit text-base text-ink-muted">
          {formatPrice(product.price)}
        </span>
        {!product.available ? (
          <div className="flex flex-wrap items-center gap-2">
            <AvailabilityBadge available={false} />
            <span className="text-sm text-error-text">Este plato está agotado. Quítalo o elige otro de la carta.</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-none items-center gap-3">
        <QuantityStepper
          value={quantity}
          min={0}
          max={quantityCap(purchasable, quantity)}
          label={product.name}
          style={sharedName('stepper', transitioning)}
          onChange={change}
        />
        <Button
          type="button"
          variant="secondary"
          aria-label={`Eliminar ${product.name} del carrito`}
          onClick={() => change(0)}
          className="w-12 flex-none px-0!"
        >
          <TrashIcon />
        </Button>
      </div>
    </li>
  );
}
