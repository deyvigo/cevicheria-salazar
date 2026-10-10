import { Link, useLocation, useViewTransitionState } from 'react-router-dom';
import { Card } from '@/components/card';
import type { Product } from '@/features/catalogo/catalog-api';
import { StarIcon } from '@/features/catalogo/components/star-icon';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { formatPrice } from '@/features/catalogo/format';
import { sharedName } from '@/features/catalogo/transition-names';

export function ProductCard({ product }: { product: Product }) {
  const location = useLocation();
  const to = `/products/${product.id}`;
  // Only the card involved in the navigation gets the shared names, so they never repeat in the grid
  const transitioning = useViewTransitionState(to);

  return (
    <Link
      to={to}
      state={{ from: location.pathname + location.search }}
      viewTransition
      className="block rounded-lg focus-visible:shadow-focus focus-visible:outline-none"
    >
      <Card className="flex flex-col gap-3">
        <DishImage
          src={product.imageUrl}
          alt={product.name}
          style={sharedName('image', transitioning)}
          className="aspect-square w-full rounded-md bg-surface-celeste object-cover"
        />
        <div className="flex flex-col gap-1">
          <h3
            style={sharedName('name', transitioning)}
            className="w-fit font-display text-[18px] leading-6 font-semibold text-ink"
          >
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span
              style={sharedName('price', transitioning)}
              className="font-display text-[20px] leading-6 font-semibold text-ink"
            >
              {formatPrice(product.price)}
            </span>
            {product.rating !== null ? (
              <span className="flex items-center gap-1 text-[13px] leading-none text-ink-muted">
                <StarIcon className="h-4 w-4" />
                {/* Trim to cap height so the digits are optically centered against the star, not the line box */}
                <span
                  aria-label={`Calificación ${product.rating.toFixed(1)} de 5`}
                  className="[text-box:trim-both_cap_alphabetic]"
                >
                  {product.rating.toFixed(1)}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
