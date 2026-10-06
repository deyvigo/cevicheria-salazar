import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { ME_QUERY_KEY, me } from '@/features/auth/auth-api';

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
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // A failed /me (401) is the normal state for a visitor, so it is not retried
  const { data, isPending } = useQuery<AuthUser | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: me,
    retry: false,
    staleTime: Infinity,
  });

  return <AuthContext.Provider value={{ user: data ?? null, isLoading: isPending }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider.');
  }
  return context;
}
