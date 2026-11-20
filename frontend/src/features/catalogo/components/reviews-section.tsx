import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Dialog } from '@/components/dialog';
import { me } from '@/features/auth/auth-api';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';
import type { AuthUser } from '@/context/auth-context';
import { ReviewFilters } from '@/features/catalogo/components/review-filters';
import type { ReviewFilter } from '@/features/catalogo/catalog-api';
import { ReviewForm } from '@/features/catalogo/components/review-form';
import { ReviewItem } from '@/features/catalogo/components/review-item';
import { ReviewList } from '@/features/catalogo/components/review-list';
import { StarIcon } from '@/features/catalogo/components/star-icon';
import { useDeleteReview, useMyReview } from '@/features/catalogo/use-reviews';

interface ReviewsSectionProps {
  productId: number;
  rating: number | null;
  reviewCount: number | null;
}

export function ReviewsSection({ productId, rating, reviewCount }: ReviewsSectionProps) {
  const location = useLocation();
  // Same cache entry as the session provider; reading it directly keeps this section usable on its own
  const session = useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: me,
    retry: false,
    staleTime: Infinity,
  });
  const user = session.data ?? null;
  const isCustomer = user?.role === 'CLIENTE';
  const mine = useMyReview(productId, isCustomer);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [writing, setWriting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteReview(productId);

  const review = mine.data?.review ?? null;
  const canWrite = isCustomer && mine.data?.canReview === true && review === null;

  return (
    <section aria-labelledby="reviews-heading" className="mt-12 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 id="reviews-heading" className="font-display text-2xl font-semibold text-ink">
            Reseñas
          </h2>
          {rating !== null ? (
            <span className="flex items-center gap-1 text-base text-ink-muted">
              <StarIcon className="h-5 w-5" />
              <span>
                {rating.toFixed(1)}
                {reviewCount !== null ? ` · ${reviewCount} ${reviewCount === 1 ? 'reseña' : 'reseñas'}` : ''}
              </span>
            </span>
          ) : null}
        </div>
        {canWrite ? (
          <Button type="button" onClick={() => setWriting(true)}>
            Escribir reseña
          </Button>
        ) : null}
        {!session.isPending && !user ? (
          <Link
            to="/iniciar-sesion"
            state={{ from: location.pathname }}
            className="text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Inicia sesión para dejar tu reseña
          </Link>
        ) : null}
      </div>

      {reviewCount !== 0 ? <ReviewFilters value={filter} onChange={setFilter} /> : null}

      {review ? (
        <Card className="flex flex-col gap-3">
          <h3 className="text-base font-bold text-ink">Tu reseña</h3>
          <ul>
            <ReviewItem review={review} />
          </ul>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setWriting(true)}>
              Editar
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
              Eliminar
            </Button>
          </div>
        </Card>
      ) : null}

      <ReviewList productId={productId} filter={filter} />

      <Dialog open={writing} title={review ? 'Editar tu reseña' : 'Deja tu reseña'} onClose={() => setWriting(false)}>
        <ReviewForm productId={productId} initial={review ?? undefined} onDone={() => setWriting(false)} />
      </Dialog>

      <Dialog open={confirming} title="Eliminar reseña" onClose={() => setConfirming(false)}>
        <div className="flex flex-col gap-5">
          {remove.isError ? (
            <p role="alert" className="text-sm font-bold text-error-text">
              No pudimos eliminar tu reseña, intenta de nuevo.
            </p>
          ) : null}
          <p className="text-base text-ink">¿Quieres eliminar tu reseña? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Volver
            </Button>
            <Button
              type="button"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync();
                } catch {
                  return;
                }
                setConfirming(false);
              }}
            >
              Eliminar reseña
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
