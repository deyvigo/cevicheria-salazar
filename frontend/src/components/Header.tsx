import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import { useAuth } from '@/context/auth-context';
import { useLogout } from '@/features/auth/use-auth-mutations';

export function Header() {
  const { user, isLoading } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // No server response: the session is still alive, so don't show the user as logged out
      setLogoutError(true);
      return;
    }
    setLogoutError(false);
    navigate('/', { state: { loggedOut: true } });
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Link to="/" className="font-display text-ink text-[24px] leading-[30px] font-semibold">
        Salazar SAC
      </Link>

      {isLoading ? null : user ? (
        <div ref={containerRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex min-h-12 items-center gap-2 rounded-md px-4 text-base font-bold text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
          >
            {user.firstName}
            <span aria-hidden="true">▾</span>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-2 min-w-48 rounded-lg border border-border bg-surface p-2 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex min-h-12 w-full items-center rounded-md px-4 text-left text-base text-ink hover:bg-surface-celeste focus-visible:shadow-focus focus-visible:outline-none"
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <Button variant="secondary" onClick={() => navigate('/iniciar-sesion')}>
          Iniciar sesión
        </Button>
      )}

      {logoutError ? (
        <div className="fixed right-6 bottom-6">
          <Notification
            variant="error"
            title="No pudimos cerrar tu sesión"
            message="Intenta de nuevo."
            onClose={() => setLogoutError(false)}
          />
        </div>
      ) : null}
    </header>
  );
}
