import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { useAddToCart, type AddableProduct } from '@/features/carrito/use-add-to-cart';

export function BuyNowButton({
  product,
  quantity = 1,
  className,
  style,
}: {
  product: AddableProduct;
  quantity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { quantity: inCart, canAdd, atLimit, add } = useAddToCart(product);
  const navigate = useNavigate();
  // At the stock limit the dish is already in the cart, so going straight to it is still the right outcome
  const enabled = canAdd || (atLimit && inCart > 0);

  return (
    <Button
      type="button"
      disabled={!enabled}
      onClick={() => {
        add(quantity);
        navigate('/cart');
      }}
      aria-label={`Comprar ${product.name}`}
      className={className}
      style={style}
    >
      Comprar
    </Button>
  );
}
