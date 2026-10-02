import { createContext, useContext, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENTE' | 'ADMINISTRADOR';
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Sesión del usuario autenticado. La cookie del JWT la maneja el backend; esto solo guarda el estado derivado. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
}
