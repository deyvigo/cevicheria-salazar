import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { takeReturnPath } from '@/features/auth/return-path';

// Google sends the customer back to "/"; this restores the screen they started from
export function ReturnPathRedirect() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || pathname !== '/') return;
    const path = takeReturnPath();
    if (path) navigate(path, { replace: true });
  }, [user, pathname, navigate]);

  return null;
}
