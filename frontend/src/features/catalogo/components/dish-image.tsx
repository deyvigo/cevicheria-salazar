import { useState, type CSSProperties } from 'react';

const PLACEHOLDER = '/dish-placeholder.svg';

export function DishImage({
  src,
  alt,
  className,
  style,
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shown = src && src !== failedUrl ? src : PLACEHOLDER;

  return (
    <img
      src={shown}
      alt={shown === PLACEHOLDER ? 'Imagen no disponible' : alt}
      onError={() => setFailedUrl(src)}
      className={className}
      style={style}
    />
  );
}
