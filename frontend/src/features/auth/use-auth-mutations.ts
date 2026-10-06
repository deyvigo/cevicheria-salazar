import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/context/auth-context';
import { ME_QUERY_KEY, forgotPassword, login, logout, register, resetPassword } from './auth-api';

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: (user) => queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, null),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => forgotPassword(email) });
}

export function useResetPassword() {
  return useMutation({ mutationFn: (payload: { token: string; password: string }) => resetPassword(payload) });
}
