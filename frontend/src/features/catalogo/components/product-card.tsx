import { Link, useLocation, useViewTransitionState } from 'react-router-dom';
import { Card } from '@/components/card';
import { AddToCartButton } from '@/features/carrito/components/add-to-cart-button';
import { BuyNowButton } from '@/features/carrito/components/buy-now-button';
import type { Product } from '@/features/catalogo/catalog-api';
import { StarIcon } from '@/features/catalogo/components/star-icon';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { formatPrice } from '@/features/catalogo/format';
import { rememberScroll } from '@/features/catalogo/scroll-memory';
import { sharedName } from '@/features/catalogo/transition-names';

export function ProductCard({ product }: { product: Product }) {
  const location = useLocation();
  const to = `/products/${product.id}`;
  // Only the card involved in the navigation gets the shared names, so they never repeat in the grid
  const transitioning = useViewTransitionState(to);
  const addable = { id: product.id, name: product.name, available: product.available, stock: product.stock };

  return (
    // The button is a sibling of the link, not a child: a button inside an anchor is invalid and would also navigate
    <div className="relative">
      <Link
        to={to}
        state={{ from: location.pathname + location.search }}
        viewTransition
        onClick={() => rememberScroll(location.pathname + location.search, window.scrollY)}
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
              className="w-fit font-display text-title-sm text-ink"
            >
              {product.name}
            </h3>
            <div className="flex items-center justify-between">
              <span
                style={sharedName('price', transitioning)}
                className="font-display text-price text-ink"
              >
                {formatPrice(product.price)}
              </span>
              {product.rating !== null ? (
                <span className="flex items-center gap-1 text-body-sm leading-none text-ink-muted">
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
          <div aria-hidden="true" className="h-12" />
        </Card>
      </Link>
      <div className="absolute inset-x-4 bottom-4 flex gap-2">
        <AddToCartButton
          product={addable}
          label="Agregar"
          variant="outline"
          style={sharedName('cta', transitioning)}
          className="flex-1 px-3"
        />
        <BuyNowButton
          product={addable}
          style={sharedName('buy', transitioning)}
          className="flex-1 px-3"
        />
      </div>
    </div>
  );
}
