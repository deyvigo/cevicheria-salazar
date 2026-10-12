import type { CSSProperties } from 'react';
import { Button } from '@/components/button';
import { useAddToCart, type AddableProduct } from '@/features/carrito/use-add-to-cart';

export function AddToCartButton({
  product,
  label,
  variant = 'primary',
  quantity = 1,
  onAdd,
  className,
  style,
}: {
  product: AddableProduct | null;
  label: string;
  variant?: 'primary' | 'secondary';
  quantity?: number;
  onAdd?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const { canAdd, add } = useAddToCart(product);

  return (
    <Button
      type="button"
      variant={variant}
      disabled={!canAdd}
      onClick={() => {
        add(quantity);
        onAdd?.();
      }}
      // The grid shows many identical buttons, so the short label needs the dish to be distinguishable
      aria-label={label === 'Agregar' && product ? `Agregar ${product.name} al carrito` : undefined}
      className={className}
      style={style}
    >
      {label}
    </Button>
  );
}
