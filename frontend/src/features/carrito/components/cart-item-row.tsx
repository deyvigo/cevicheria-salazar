import { Link, useLocation, useViewTransitionState } from 'react-router-dom';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { AvailabilityBadge } from '@/features/catalogo/components/availability-badge';
import { formatPrice } from '@/features/catalogo/format';
import { rememberScroll } from '@/features/catalogo/scroll-memory';
import { sharedName } from '@/features/catalogo/transition-names';
import type { Product } from '@/features/catalogo/catalog-api';

export function CartItemRow({ product, quantity }: { product: Product; quantity: number }) {
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
    <li className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
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
      <p className="flex-none text-base text-ink">
        <span className="text-ink-muted">Cantidad: </span>
        <span className="font-bold">{quantity}</span>
      </p>
    </li>
  );
}
