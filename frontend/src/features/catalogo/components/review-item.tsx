import { StarIcon } from '@/features/catalogo/components/star-icon';
import type { Review } from '@/features/catalogo/catalog-api';

const DATE_FORMAT = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

export function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-body font-bold text-ink">{review.authorName}</span>
        <span className="flex gap-0.5" role="img" aria-label={`${review.rating} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon key={star} className={`h-4 w-4 ${star <= review.rating ? '' : 'opacity-25'}`} />
          ))}
        </span>
        <span className="text-body-sm text-ink-muted">
          {DATE_FORMAT.format(new Date(review.createdAt))}
          {review.edited ? ' · editado' : ''}
        </span>
      </div>
      {review.comment ? <p className="text-body whitespace-pre-line text-ink">{review.comment}</p> : null}
    </li>
  );
}
