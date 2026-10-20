import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '@/components/notification';
import { useCartStore } from '@/features/carrito/cart-store';

export function CartNotice() {
  const lastAdded = useCartStore((state) => state.lastAdded);
  const lastRemoved = useCartStore((state) => state.lastRemoved);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const event = lastAdded ?? lastRemoved;

  if (!event || dismissedAt === event.at) return null;
  return (
    <div className="fixed right-6 bottom-6">
      <Notification
        variant="success"
        title={lastAdded ? `Agregamos ${event.name} a tu carrito` : `Quitamos ${event.name} de tu carrito`}
        onClose={() => setDismissedAt(event.at)}
        action={
          lastAdded ? (
            <Link
              to="/cart"
              className="text-sm font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
            >
              Ver carrito
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
