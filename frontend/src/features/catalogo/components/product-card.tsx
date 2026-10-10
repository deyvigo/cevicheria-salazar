import { useState } from 'react';
import { Card } from '@/components/card';
import type { Product } from '@/features/catalogo/catalog-api';
import { formatPrice } from '@/features/catalogo/format';

const PLACEHOLDER = '/dish-placeholder.svg';

export function ProductCard({ product }: { product: Product }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = product.imageUrl && product.imageUrl !== failedUrl ? product.imageUrl : PLACEHOLDER;

  return (
    <Card className="flex flex-col gap-3">
      <img
        src={src}
        alt={src === PLACEHOLDER ? 'Imagen no disponible' : product.name}
        onError={() => setFailedUrl(product.imageUrl)}
        className="aspect-square w-full rounded-md bg-surface-celeste object-cover"
      />
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[18px] leading-6 font-semibold text-ink">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="font-display text-[20px] leading-6 font-semibold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.rating !== null ? (
            <span className="flex items-center gap-1 text-[13px] leading-none text-ink-muted">
              <svg viewBox="1.5 0.6 17 17" aria-hidden="true" className="h-4 w-4 flex-none fill-naranja-500">
                <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.1l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
              </svg>
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
  );
}
