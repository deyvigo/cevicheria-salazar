import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/context/auth-context';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';
import { changePassword, updateProfile, type ChangePasswordPayload, type UpdateProfilePayload } from './profile-api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (user) => queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, user),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
    onSuccess: () =>
      queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, (user) => (user ? { ...user, hasPassword: true } : user)),
  });
}
