import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/button';
import { CloseIcon } from '@/components/icons/close-icon';
import type { ProductImageItem } from '@/features/admin/admin-product-api';

export const MAX_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductImagesFieldProps {
  value: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
  error?: string;
}

export function ProductImagesField({ value, onChange, error }: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());
  const [rejected, setRejected] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = '';
    const valid = chosen.filter((file) => ACCEPTED.includes(file.type) && file.size <= MAX_BYTES);
    const room = Math.max(MAX_IMAGES - value.length, 0);
    setRejected(valid.length < chosen.length);
    const added = valid.slice(0, room).map((file) => {
      const url = URL.createObjectURL(file);
      previews.current.add(url);
      return { key: `new-${crypto.randomUUID()}`, url, file };
    });
    if (added.length > 0) onChange([...value, ...added]);
  }

  function moveTo(from: number, to: number) {
    if (from === to || to < 0 || to >= value.length) return;
    const next = [...value];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  }

  function remove(index: number) {
    const removed = value[index];
    if (removed.file) {
      URL.revokeObjectURL(removed.url);
      previews.current.delete(removed.url);
    }
    onChange(value.filter((_, position) => position !== index));
  }

  const full = value.length >= MAX_IMAGES;
  const message = error ?? (rejected ? 'Solo JPG, PNG o WebP de hasta 5 MB.' : undefined);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-ink">Imágenes</span>
      {value.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((image, index) => (
            <li
              key={image.key}
              draggable
              tabIndex={0}
              aria-label={`Imagen ${index + 1}, arrastra o usa Alt y las flechas para moverla`}
              onDragStart={(event) => {
                if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
                setDragging(index);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging !== null) moveTo(dragging, index);
                setDragging(null);
              }}
              onDragEnd={() => setDragging(null)}
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
                event.preventDefault();
                moveTo(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
              }}
              className={`group relative cursor-grab rounded-md focus-visible:shadow-focus focus-visible:outline-none ${
                dragging === index ? 'opacity-40' : ''
              }`}
            >
              <img
                src={image.url}
                alt={`Imagen ${index + 1}`}
                draggable={false}
                className="aspect-square w-full rounded-md object-cover"
              />
              {index === 0 ? (
                <span className="absolute top-1 left-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-ink">
                  Principal
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Quitar imagen ${index + 1}`}
                className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink opacity-0 shadow-md group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(',')}
        aria-label="Archivos de imagen"
        tabIndex={-1}
        className="sr-only"
        onChange={addFiles}
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" disabled={full} onClick={() => inputRef.current?.click()}>
          Agregar imágenes
        </Button>
        <span className="text-sm text-ink-muted">{full ? 'Máximo 5 imágenes' : `${value.length} de ${MAX_IMAGES}`}</span>
      </div>
      {message ? <p className="text-sm font-bold text-error-text">{message}</p> : null}
    </div>
  );
}
