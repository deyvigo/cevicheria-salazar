import { createContext, useContext } from 'react';

interface AdminSession {
  // Rejects when the server could not close the session, which then stays alive
  signOut: () => Promise<void>;
}

export const AdminSessionContext = createContext<AdminSession | undefined>(undefined);

export function useAdminSession() {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error('useAdminSession debe usarse dentro de un AdminGuard.');
  }
  return context;
}
