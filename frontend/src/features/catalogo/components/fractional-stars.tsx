import { StarIcon } from '@/features/catalogo/components/star-icon';

const STARS = [0, 1, 2, 3, 4];

// Each star is filled in proportion to the rating: 4.3 paints four stars and 30% of the fifth
export function FractionalStars({ rating, className }: { rating: number; className: string }) {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {STARS.map((index) => {
        const filled = Math.min(Math.max(rating - index, 0), 1);
        return (
          <span key={index} className="relative flex">
            <StarIcon className={`${className} opacity-25`} />
            {filled > 0 ? (
              <StarIcon
                className={`${className} absolute inset-0`}
                style={{ clipPath: `inset(0 ${Math.round((1 - filled) * 100)}% 0 0)` }}
              />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
