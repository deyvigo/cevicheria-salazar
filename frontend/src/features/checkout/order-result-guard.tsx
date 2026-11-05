import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NotFound } from '@/components/not-found';
import { useAuth } from '@/context/auth-context';

// The customer arrives from the payment provider with an empty checkout state, so only the session is required
export function OrderResultGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    return <Navigate to="/iniciar-sesion" state={{ from: location.pathname + location.search }} replace />;
  }
  if (user.role !== 'CLIENTE') return <NotFound />;
  return <>{children}</>;
}
