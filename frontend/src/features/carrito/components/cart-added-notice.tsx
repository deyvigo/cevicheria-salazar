import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '@/components/notification';
import { useCartStore } from '@/features/carrito/cart-store';

const TOAST_DURATION_MS = 4000;

export function CartAddedNotice() {
  const lastAdded = useCartStore((state) => state.lastAdded);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const at = lastAdded?.at ?? null;

  useEffect(() => {
    if (at === null) return;
    const timer = setTimeout(() => setDismissedAt(at), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [at]);

  if (!lastAdded || dismissedAt === lastAdded.at) return null;
  return (
    <div className="fixed right-6 bottom-6">
      <Notification
        variant="success"
        title={`Agregamos ${lastAdded.name} a tu carrito`}
        onClose={() => setDismissedAt(lastAdded.at)}
        action={
          <Link
            to="/cart"
            className="text-sm font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Ver carrito
          </Link>
        }
      />
    </div>
  );
}
