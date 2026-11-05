import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/features/carrito/cart-store';
import { useCheckoutStore } from '@/features/checkout/checkout-store';

interface CheckoutGuardProps {
  children: ReactNode;
  requireDelivery?: boolean;
}

export function CheckoutGuard({ children, requireDelivery = false }: CheckoutGuardProps) {
  const { user, isLoading } = useAuth();
  const entered = useCheckoutStore((state) => state.entered);
  const hasDelivery = useCheckoutStore((state) => state.deliveryType === 'pickup' || state.selectedAddressId !== null);
  const hasItems = useCartStore((state) => state.items.length > 0);

  if (isLoading) return null;
  if (user === null || !entered || !hasItems || (requireDelivery && !hasDelivery)) {
    return <Navigate to="/cart" replace />;
  }
  return <>{children}</>;
}
