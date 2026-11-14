import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '@/components/notification';
import { useCartStore } from '@/features/carrito/cart-store';

export function CartNotice() {
  const lastAdded = useCartStore((state) => state.lastAdded);
  const lastRemoved = useCartStore((state) => state.lastRemoved);
  const lastCleared = useCartStore((state) => state.lastCleared);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const event = lastAdded ?? lastRemoved ?? lastCleared;

  if (!event || dismissedAt === event.at) return null;
  return (
    <div className="fixed right-6 bottom-6">
      <Notification
        variant="success"
        title={
          lastAdded
            ? `Agregamos ${lastAdded.name} a tu carrito`
            : lastRemoved
              ? `Quitamos ${lastRemoved.name} de tu carrito`
              : 'Vaciamos tu carrito'
        }
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
