import type { AuthUser } from '@/context/auth-context';
import { api } from '@/lib/api';

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  phone: string;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const { data } = await api.put<AuthUser>('/perfil', payload);
  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.put('/perfil/contrasena', payload);
}
