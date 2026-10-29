import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/features/carrito/cart-store';
import { useCheckoutStore } from '@/features/checkout/checkout-store';

export function CheckoutGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const entered = useCheckoutStore((state) => state.entered);
  const hasItems = useCartStore((state) => state.items.length > 0);

  if (isLoading) return null;
  if (user === null || !entered || !hasItems) return <Navigate to="/cart" replace />;
  return <>{children}</>;
}
