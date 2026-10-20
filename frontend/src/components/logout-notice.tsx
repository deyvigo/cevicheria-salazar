import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Notification } from '@/components/notification';

export function LogoutNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const arrivedLoggedOut = (location.state as { loggedOut?: boolean } | null)?.loggedOut === true;
  if (arrivedLoggedOut && seenKey !== location.key) {
    setSeenKey(location.key);
    setVisible(true);
  }

  useEffect(() => {
    // Clear the state so reloading the page doesn't repeat the notice
    if (arrivedLoggedOut) navigate('.', { replace: true, state: null });
  }, [arrivedLoggedOut, navigate]);

  if (!visible) return null;
  return (
    <div className="fixed right-6 bottom-6">
      <Notification variant="success" title="Cerraste sesión" onClose={() => setVisible(false)} />
    </div>
  );
}
