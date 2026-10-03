import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { me } from '@/features/auth/authApi';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'CLIENTE' | 'ADMINISTRADOR';
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  /** `true` hasta saber si ya había una sesión al abrir la app. */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Sesión del usuario autenticado. La cookie del JWT la maneja el backend; esto solo guarda el estado derivado. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    me()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        // 401 (incluso tras intentar renovar): es el estado normal de un Visitante.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ user, setUser, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
}
