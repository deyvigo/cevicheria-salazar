import { Link } from 'react-router-dom';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CartPopoverRow } from '@/features/carrito/components/cart-popover-row';
import { useCartStore } from '@/features/carrito/cart-store';
import { useCartDetails } from '@/features/carrito/use-cart-details';
import { formatPrice } from '@/features/catalogo/format';

export function CartPopover() {
  const emptyCart = useCartStore((state) => state.emptyCart);
  const { items, query, productsById, summary } = useCartDetails();

  if (items.length === 0) {
    return (
      <Card role="region" aria-label="Resumen del carrito" className="flex flex-col gap-3">
        <p className="text-base text-ink-muted">Tu carrito está vacío.</p>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="Resumen del carrito" className="flex flex-col gap-4">
      {query.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-sm text-ink-muted">No pudimos cargar tu carrito.</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ul aria-busy={query.isPending} className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
              return query.isPending ? (
                <li key={item.productId} className="h-16 animate-pulse rounded-md bg-surface-celeste" />
              ) : null;
            }
            return <CartPopoverRow key={item.productId} product={product} quantity={item.quantity} />;
          })}
        </ul>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
        <span className="font-display text-[18px] leading-6 font-semibold text-ink">Total</span>
        {summary === null ? (
          <span aria-hidden="true" className="h-6 w-20 animate-pulse rounded-md bg-surface-celeste" />
        ) : (
          <span className="font-display text-[18px] leading-6 font-semibold text-ink">
            {formatPrice(summary.total)}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1 px-4" onClick={emptyCart}>
          Vaciar carrito
        </Button>
        <Link
          to="/cart"
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-action px-4 text-base font-bold text-on-action shadow-xs hover:bg-action-hover active:bg-action-pressed focus-visible:shadow-focus focus-visible:outline-none"
        >
          Ver carrito
        </Link>
      </div>
    </Card>
  );
}
