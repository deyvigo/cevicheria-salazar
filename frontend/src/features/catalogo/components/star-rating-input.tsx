import { useState } from 'react';
import { StarIcon } from '@/features/catalogo/components/star-icon';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRatingInput({ value, onChange, error }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col gap-2">
      <span id="review-rating-label" className="text-sm font-bold text-ink">
        Tu calificación
      </span>
      <div
        role="radiogroup"
        aria-labelledby="review-rating-label"
        aria-invalid={error ? true : undefined}
        className="flex gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            className="flex h-10 w-10 items-center justify-center rounded-md focus-visible:shadow-focus focus-visible:outline-none"
          >
            <StarIcon className={`h-8 w-8 ${star <= shown ? '' : 'opacity-25'}`} />
          </button>
        ))}
      </div>
      {error ? <p className="text-sm font-bold text-error-text">{error}</p> : null}
    </div>
  );
}
