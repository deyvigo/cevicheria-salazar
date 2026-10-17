import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { NotFound } from '@/components/not-found';
import { useAuth } from '@/context/auth-context';

export function ProfileGuard() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [wasCustomer, setWasCustomer] = useState(false);
  const isCustomer = user?.role === 'CLIENTE';

  if (isCustomer && !wasCustomer) setWasCustomer(true);

  if (isLoading) return null;
  // The session ended while the profile was open (the header's logout, which navigates home itself)
  if (!user) return wasCustomer ? null : <Navigate to="/iniciar-sesion" state={{ from: location.pathname }} replace />;
  if (!isCustomer) return <NotFound />;
  return <Outlet />;
}
