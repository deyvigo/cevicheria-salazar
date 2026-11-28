import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AddToCartButton } from '@/features/carrito/components/add-to-cart-button';
import type { FeaturedProduct } from '@/features/catalogo/catalog-api';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { formatPrice } from '@/features/catalogo/format';
import { useFeaturedProducts } from '@/features/home/use-featured-products';

const SLOTS = 5;
const TILE = 'relative overflow-hidden rounded-lg aspect-square';
const LARGE = 'col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto';

function Tile({ product, large }: { product: FeaturedProduct; large: boolean }) {
  const addable = { id: product.id, name: product.name, available: product.available, stock: product.stock };

  return (
    <article className={`${TILE} ${large ? LARGE : ''} group bg-surface-celeste shadow-sm`}>
      <DishImage
        src={product.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      />
      <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden="true" />
      {product.bestSeller ? (
        <span className="absolute top-3 left-3 rounded-full bg-action px-3 py-1 text-caption text-on-action">
          Más vendido
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 lg:p-4">
        <h3 className={`font-display text-surface ${large ? 'text-title-md' : 'text-title-sm'}`}>
          {/* The link covers the whole tile; the button sits above it so it stays clickable on its own */}
          <Link
            to={`/products/${product.id}`}
            className="rounded-md after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:shadow-focus"
          >
            {product.name}
          </Link>
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-price text-surface">{formatPrice(product.price)}</span>
          <AddToCartButton product={addable} label="Agregar" variant="secondary" className="relative z-10 px-4" />
        </div>
      </div>
    </article>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:grid-rows-2">{children}</div>;
}

export function FeaturedBento() {
  const titleId = useId();
  const { data, isPending, isError } = useFeaturedProducts();

  if (isError || (data && data.length === 0)) return null;

  return (
    <section aria-labelledby={titleId} className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={titleId} className="font-display text-title-lg text-ink">
          Los favoritos de la casa
        </h2>
        <Link
          to="/menu"
          className="rounded-md text-body font-bold text-link underline-offset-2 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
        >
          Ver toda la carta
        </Link>
      </div>
      {isPending ? (
        <Grid>
          {Array.from({ length: SLOTS }, (_, index) => (
            <div
              key={index}
              data-testid="featured-skeleton"
              className={`${TILE} ${index === 0 ? LARGE : ''} animate-pulse bg-surface-celeste motion-reduce:animate-none`}
            />
          ))}
        </Grid>
      ) : (
        <Grid>
          {data.map((product, index) => (
            <Tile key={product.id} product={product} large={index === 0} />
          ))}
        </Grid>
      )}
    </section>
  );
}
