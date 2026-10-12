import { useState, type CSSProperties } from 'react';
import { AddToCartButton } from '@/features/carrito/components/add-to-cart-button';
import { QuantityStepper } from '@/features/carrito/components/quantity-stepper';
import { useCartStore } from '@/features/carrito/cart-store';
import { useAddToCart, type AddableProduct } from '@/features/carrito/use-add-to-cart';

export function ProductPurchase({
  product,
  ctaStyle,
  stepperStyle,
}: {
  product: AddableProduct;
  ctaStyle?: CSSProperties;
  stepperStyle?: CSSProperties;
}) {
  const { quantity, cap, canAdd, atLimit } = useAddToCart(product);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const [pending, setPending] = useState(1);
  // Only a removal makes the button come back animated; arriving at the page with it there is not an event
  const [returning, setReturning] = useState(false);
  const inCart = quantity > 0;
  const chosen = Math.max(1, Math.min(pending, cap));

  function change(next: number) {
    if (!inCart) {
      setPending(next);
    } else if (next <= 0) {
      setReturning(true);
      remove(product.id, product.name);
    } else {
      setQuantity(
        { id: product.id, name: product.name, available: product.available === true, stock: product.stock ?? 0 },
        next,
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {inCart && atLimit ? (
        <p aria-live="polite" className="text-sm text-ink-muted">
          Ya tienes todo el stock disponible en tu carrito
        </p>
      ) : null}
      {/* One instance for both states so the field doesn't remount when the dish enters or leaves the cart */}
      <QuantityStepper
        value={inCart ? quantity : chosen}
        min={inCart ? 0 : 1}
        max={cap}
        label={product.name}
        disabled={!inCart && !canAdd}
        fullWidth
        style={stepperStyle}
        onChange={change}
      />
      {/* The slot keeps its height while the dish is in the cart so the stepper doesn't jump when the button returns */}
      <div className="min-h-12">
        {inCart ? null : (
          <AddToCartButton
            product={product}
            label="Agregar al carrito"
            quantity={chosen}
            onAdd={() => {
              setPending(1);
              setReturning(false);
            }}
            style={ctaStyle}
            className={`w-full ${returning ? 'motion-safe:animate-slide-in-down' : ''}`}
          />
        )}
      </div>
    </div>
  );
}
