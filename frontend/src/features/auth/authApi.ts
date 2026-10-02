import type { AuthUser } from '@/context/AuthContext';
import { api } from '@/lib/api';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

/** `POST /api/auth/register` — la cookie del login automático la pone el backend. */
export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/register', payload);
  return data;
}
