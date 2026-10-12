import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import { CartItemRow } from '@/features/carrito/components/cart-item-row';
import { ShareButton } from '@/features/carrito/components/share-button';
import { useCartStore } from '@/features/carrito/cart-store';
import { decodeCart } from '@/features/carrito/share-code';
import { useCartProducts } from '@/features/carrito/use-cart-products';
import { takeScroll } from '@/features/catalogo/scroll-memory';

const TOAST_DURATION_MS = 4000;

type SharedNotice = 'loaded' | 'invalid' | null;

export function CartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const items = useCartStore((state) => state.items);
  const importItems = useCartStore((state) => state.importItems);
  const reconcile = useCartStore((state) => state.reconcile);
  const code = searchParams.get('c');
  // Read once on arrival: the code is removed from the URL right after, so it can't be re-derived from it
  const [sharedNotice, setSharedNotice] = useState<SharedNotice>(() =>
    code === null ? null : decodeCart(code).ok ? 'loaded' : 'invalid',
  );

  useEffect(() => {
    if (sharedNotice === null) return;
    const timer = setTimeout(() => setSharedNotice(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [sharedNotice]);

  useEffect(() => {
    if (code === null) return;
    const decoded = decodeCart(code);
    if (decoded.ok) importItems(decoded.items);
    // Drop the code so reloading or going back doesn't import it again
    const next = new URLSearchParams(searchParams);
    next.delete('c');
    setSearchParams(next, { replace: true });
  }, [code, importItems, searchParams, setSearchParams]);

  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const idsKey = ids.join(',');
  const query = useCartProducts(ids);

  useEffect(() => {
    if (!query.isSuccess || query.isFetching || query.isPlaceholderData) return;
    reconcile(idsKey.split(',').map(Number), query.data);
  }, [idsKey, query.data, query.isSuccess, query.isFetching, query.isPlaceholderData, reconcile]);

  // Coming back from a dish: put the list where it was once the rows exist, before paint
  const location = useLocation();
  const navigationType = useNavigationType();
  const isReturn =
    navigationType === 'POP' || (location.state as { restoreScroll?: boolean } | null)?.restoreScroll === true;
  const restoredFor = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!query.data || query.isPlaceholderData || restoredFor.current === location.key) return;
    restoredFor.current = location.key;
    if (!isReturn) return;
    const y = takeScroll(location.pathname);
    if (y !== null) window.scrollTo({ top: y });
  }, [query.data, query.isPlaceholderData, location.key, location.pathname, isReturn]);

  const productsById = new Map((query.data ?? []).map((product) => [product.id, product]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
      {sharedNotice ? (
        <div className="fixed right-6 bottom-6">
          <Notification
            variant={sharedNotice === 'loaded' ? 'success' : 'error'}
            title={
              sharedNotice === 'loaded'
                ? 'Cargamos el carrito que te compartieron'
                : 'No pudimos leer el carrito compartido'
            }
            onClose={() => setSharedNotice(null)}
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">Tu carrito</h1>
        {items.length > 0 ? <ShareButton items={items} /> : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-base text-ink-muted">Tu carrito está vacío.</p>
          <Link
            to="/menu"
            className="text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Ver la carta
          </Link>
        </div>
      ) : query.isError ? (
        <div role="alert" className="flex flex-col items-center gap-4 py-12">
          <p className="text-base text-ink-muted">No pudimos cargar tu carrito.</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <ul aria-busy={query.isPending} className="flex flex-col gap-3">
          {items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) {
              return query.isPending ? (
                <li key={item.productId} className="h-28 animate-pulse rounded-lg bg-surface-celeste" />
              ) : null;
            }
            return <CartItemRow key={item.productId} product={product} quantity={item.quantity} />;
          })}
        </ul>
      )}
    </main>
  );
}
