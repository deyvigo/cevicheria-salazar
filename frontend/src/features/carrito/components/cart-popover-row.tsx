import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { MinusIcon } from '@/components/icons/minus-icon';
import { PlusIcon } from '@/components/icons/plus-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import { quantityCap, useCartStore } from '@/features/carrito/cart-store';
import { formatPrice } from '@/features/catalogo/format';
import { DishImage } from '@/features/catalogo/components/dish-image';
import type { Product } from '@/features/catalogo/catalog-api';
import { useFadeOut } from '@/lib/use-fade-out';

export function CartPopoverRow({ product, quantity }: { product: Product; quantity: number }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const purchasable = {
    id: product.id,
    name: product.name,
    available: product.available,
    stock: product.stock,
  };

  const { leaving, start: fadeOut } = useFadeOut();

  function change(next: number) {
    if (leaving) return;
    if (next <= 0) fadeOut(() => remove(product.id, product.name));
    else setQuantity(purchasable, next);
  }

  return (
    <li
      className={`flex items-center gap-3 transition-opacity duration-250 ease-out ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <DishImage
        src={product.imageUrl}
        alt={product.name}
        className="h-12 w-12 flex-none rounded-md bg-surface-celeste object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span title={product.name} className="truncate text-sm font-bold text-ink">
          {product.name}
        </span>
        <span className="text-xs text-ink-muted">{formatPrice(product.price)}</span>
        {!product.available ? (
          <span className="truncate text-xs text-error-text">Agotado, no suma al total</span>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label={`Quitar una unidad de ${product.name}`}
            onClick={() => change(quantity - 1)}
            className="size-8 min-h-8! px-0!"
          >
            <MinusIcon strokeWidth={2.5} />
          </Button>
          <span
            role="status"
            aria-label={`Cantidad de ${product.name}`}
            className="min-w-6 text-center text-sm text-ink"
          >
            {quantity}
          </span>
          <Button
            type="button"
            variant="secondary"
            aria-label={`Agregar una unidad de ${product.name}`}
            disabled={quantity >= quantityCap(purchasable, quantity)}
            onClick={() => change(quantity + 1)}
            className="size-8 min-h-8! px-0!"
          >
            <PlusIcon strokeWidth={2.5} />
          </Button>
        </div>
      </div>
      <IconButton
        type="button"
        variant="secondary"
        aria-label={`Eliminar ${product.name} del carrito`}
        onClick={() => change(0)}
      >
        <TrashIcon />
      </IconButton>
    </li>
  );
}
