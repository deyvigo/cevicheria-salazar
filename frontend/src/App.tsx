import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Notification } from '@/components/Notification';

const TOAST_DURATION_MS = 4000;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // El aviso llega por el estado de navegación (HU-05) y puede llegar con `App` ya montada
  // (cerrar sesión estando en `/`), así que se reacciona a cada navegación nueva. Luego el
  // estado se limpia para que recargar la página no repita el aviso.
  const [loggedOut, setLoggedOut] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const arrivedLoggedOut = (location.state as { loggedOut?: boolean } | null)?.loggedOut === true;
  if (arrivedLoggedOut && seenKey !== location.key) {
    setSeenKey(location.key);
    setLoggedOut(true);
  }

  useEffect(() => {
    if (arrivedLoggedOut) navigate('.', { replace: true, state: null });
  }, [arrivedLoggedOut, navigate]);

  useEffect(() => {
    if (!loggedOut) return;
    const timer = setTimeout(() => setLoggedOut(false), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [loggedOut]);

  return (
    <main className="min-h-svh bg-bg p-6">
      <h1 className="font-display text-ink text-[32px] leading-[38px] font-semibold">Salazar SAC</h1>
      <p className="text-ink-muted">Entorno base configurado (HT-09). Las pantallas llegan historia por historia.</p>

      {loggedOut ? (
        <div className="fixed right-6 bottom-6">
          <Notification variant="success" title="Cerraste sesión" onClose={() => setLoggedOut(false)} />
        </div>
      ) : null}
    </main>
  );
}

export default App;
