import { useMemo, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { NotFound } from '@/components/not-found';
import { useAuth } from '@/context/auth-context';
import { useLogout } from '@/features/auth/use-auth-mutations';
import { AdminSessionContext } from './admin-session';

export function AdminGuard() {
  const { user, isLoading } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [wasAdmin, setWasAdmin] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isAdmin = user?.role === 'ADMINISTRADOR';

  if (isAdmin && !wasAdmin) setWasAdmin(true);

  const session = useMemo(
    () => ({
      async signOut() {
        // Clearing the user would otherwise look like an expired session and send them to the login
        setLeaving(true);
        try {
          await logoutMutation.mutateAsync();
        } catch (error) {
          setLeaving(false);
          throw error;
        }
        navigate('/', { state: { loggedOut: true } });
      },
    }),
    [logoutMutation, navigate],
  );

  if (isLoading || leaving) return null;
  if (isAdmin) {
    return (
      <AdminSessionContext.Provider value={session}>
        <Outlet />
      </AdminSessionContext.Provider>
    );
  }
  if (!user && wasAdmin) return <Navigate to="/iniciar-sesion" replace />;

  // Rendered in place (no redirect), so /admin does not reveal that it exists
  return <NotFound />;
}
