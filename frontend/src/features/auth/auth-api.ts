import type { AuthUser } from '@/context/auth-context';
import { api } from '@/lib/api';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/register', payload);
  return data;
}

export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/auth/login', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<string> {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email });
  return data.message;
}

export async function validateResetToken(token: string): Promise<void> {
  await api.get('/auth/reset-password/validate', { params: { token } });
}

export async function resetPassword(payload: { token: string; password: string }): Promise<void> {
  await api.post('/auth/reset-password', payload);
}
