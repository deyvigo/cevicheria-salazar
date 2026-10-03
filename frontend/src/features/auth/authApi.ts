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

/** `GET /api/auth/me` — `401` si no hay sesión válida. */
export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

/** `POST /api/auth/logout` — revoca la sesión de este dispositivo y borra las cookies. Siempre `204`. */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** `POST /api/auth/login`. */
export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/login', payload);
  return data;
}
