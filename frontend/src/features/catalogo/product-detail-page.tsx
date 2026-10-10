import axios from 'axios';
import { useCallback } from 'react';
import { Link, useLocation, useParams, useViewTransitionState } from 'react-router-dom';
import { ProductGallery } from '@/features/catalogo/components/product-gallery';
import { formatPrice } from '@/features/catalogo/format';
import { sharedName } from '@/features/catalogo/transition-names';
import { useProduct } from '@/features/catalogo/use-catalog-queries';

function parseId(raw: string | undefined): number | null {
  return raw && /^[1-9]\d{0,15}$/.test(raw) ? Number(raw) : null;
}

export function ProductDetailPage() {
  const { id: rawId } = useParams();
  const id = parseId(rawId);
  const location = useLocation();
  const transitioning = useViewTransitionState(`/products/${rawId ?? ''}`);
  const query = useProduct(id);
  const product = query.data;
  const focusHeading = useCallback((element: HTMLHeadingElement | null) => {
    element?.focus({ preventScroll: true });
  }, []);

  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from ?? (product?.category ? `/${product.category.slug}` : '/');
  const notFound = id === null || (axios.isAxiosError(query.error) && query.error.response?.status === 404);

  if (notFound) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-12">
        <p role="alert" className="text-base text-ink-muted">
          No encontramos este plato.
        </p>
        <Link
          to="/"
          className="text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
        >
          Volver al catálogo
        </Link>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <p role="alert" className="text-center text-base text-ink-muted">
          No pudimos cargar el plato. Intenta de nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6">
      <Link
        to={backTo}
        viewTransition
        className="mb-4 inline-flex min-h-12 items-center gap-1 rounded-md text-base font-bold text-ink focus-visible:shadow-focus focus-visible:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 flex-none fill-none stroke-current"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
        <span className="underline">Volver</span>
      </Link>
      {!product ? (
        <div aria-busy="true" className="grid grid-cols-2 gap-8">
          <div className="aspect-square animate-pulse rounded-lg bg-surface-celeste" />
          <div className="h-48 animate-pulse rounded-lg bg-surface-celeste" />
        </div>
      ) : (
        <div className="grid grid-cols-2 items-start gap-8">
          <ProductGallery images={product.images} name={product.name} transitioning={transitioning} />
          <div className="flex flex-col gap-3">
            {/* Always reserve the line: the list placeholder has no category, and it arriving late would push the title down */}
            <p className="h-6 text-base leading-6 text-ink-muted">{product.category?.name}</p>
            <h1
              ref={focusHeading}
              tabIndex={-1}
              style={sharedName('name', transitioning)}
              className="w-fit font-display text-[32px] leading-10 font-semibold text-ink focus:outline-none"
            >
              {product.name}
            </h1>
            {product.rating !== null ? (
              <span className="flex items-center gap-1 text-base text-ink-muted">
                <svg viewBox="1.5 0.6 17 17" aria-hidden="true" className="h-5 w-5 flex-none fill-naranja-500">
                  <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
                </svg>
                <span aria-label={`Calificación ${product.rating.toFixed(1)} de 5`}>{product.rating.toFixed(1)}</span>
              </span>
            ) : null}
            <p
              style={sharedName('price', transitioning)}
              className="w-fit font-display text-[28px] leading-8 font-semibold text-ink"
            >
              {formatPrice(product.price)}
            </p>
            <p className="text-base whitespace-pre-line text-ink">{product.description}</p>
          </div>
        </div>
      )}
    </main>
  );
}
