import { useEffect, useRef } from 'react';
import { Button } from '@/components/button';
import { ReviewItem } from '@/features/catalogo/components/review-item';
import type { ReviewFilter } from '@/features/catalogo/catalog-api';
import { useReviews } from '@/features/catalogo/use-reviews';

export function ReviewList({ productId, filter = 'all' }: { productId: number; filter?: ReviewFilter }) {
  const query = useReviews(productId, filter);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (query.isPending) {
    return <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-surface-celeste" />;
  }
  if (query.isError && !query.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-base text-ink-muted">No pudimos cargar las reseñas.</p>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  const { items } = query.data;
  if (items.length === 0) {
    return (
      <p className="text-base text-ink-muted">
        {filter === 'all' ? 'Aún no hay reseñas.' : 'No hay reseñas de este tipo.'}
      </p>
    );
  }

  return (
    <div>
      <ul>
        {items.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
      {isFetchNextPageError ? (
        <div role="alert" className="flex flex-col items-start gap-3 py-4">
          <p className="text-base text-ink-muted">No pudimos cargar más reseñas.</p>
          <Button type="button" variant="outline" onClick={() => void fetchNextPage()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {hasNextPage ? (
        <div ref={sentinel} aria-busy={isFetchingNextPage} className="flex h-12 items-center justify-center">
          {isFetchingNextPage ? <p className="text-sm text-ink-muted">Cargando reseñas…</p> : null}
        </div>
      ) : null}
    </div>
  );
}
