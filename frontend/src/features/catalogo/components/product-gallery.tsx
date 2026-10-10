import { useState } from 'react';
import { DishImage } from '@/features/catalogo/components/dish-image';
import { sharedName } from '@/features/catalogo/transition-names';

export function ProductGallery({
  images,
  name,
  transitioning,
}: {
  images: string[];
  name: string;
  transitioning: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const main = images[selected] ?? images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <DishImage
        src={main}
        alt={name}
        style={selected === 0 ? sharedName('image', transitioning) : undefined}
        className="aspect-square w-full rounded-lg bg-surface-celeste object-cover"
      />
      {images.length > 1 ? (
        <ul className="flex gap-3" aria-label="Imágenes del plato">
          {images.map((url, index) => (
            <li key={`${url}-${index}`}>
              <button
                type="button"
                aria-label={`Ver imagen ${index + 1}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={`block cursor-pointer overflow-hidden rounded-md border-2 focus-visible:shadow-focus focus-visible:outline-none ${
                  index === selected ? 'border-focus-ring' : 'border-border'
                }`}
              >
                <DishImage src={url} alt="" className="h-16 w-16 bg-surface-celeste object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
