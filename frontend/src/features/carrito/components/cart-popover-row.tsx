import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { MinusIcon } from '@/components/icons/minus-icon';
import { PlusIcon } from '@/components/icons/plus-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import { quantityCap, useCartStore } from '@/features/carrito/cart-store';
import { DishImage } from '@/features/catalogo/components/dish-image';
import type { Product } from '@/features/catalogo/catalog-api';

export function CartPopoverRow({ product, quantity }: { product: Product; quantity: number }) {
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const purchasable = {
    id: product.id,
    name: product.name,
    available: product.available,
    stock: product.stock,
  };

  function change(next: number) {
    if (next <= 0) remove(product.id, product.name);
    else setQuantity(purchasable, next);
  }

  return (
    <li className="flex items-center gap-3">
      <DishImage
        src={product.imageUrl}
        alt={product.name}
        className="h-12 w-12 flex-none rounded-md bg-surface-celeste object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span title={product.name} className="truncate text-sm font-bold text-ink">
          {product.name}
        </span>
        {!product.available ? (
          <span className="truncate text-xs text-error-text">Agotado, no suma al total</span>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            aria-label={`Quitar una unidad de ${product.name}`}
            onClick={() => change(quantity - 1)}
            className="h-8 min-h-8 w-8 px-0!"
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
            className="h-8 min-h-8 w-8 px-0!"
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
