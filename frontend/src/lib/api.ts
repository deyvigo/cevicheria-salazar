import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AuthUser } from '@/context/auth-context';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';
import { queryClient } from '@/lib/query-client';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// /perfil is shared with customers, who keep their own session handling
const isAdminRequest = (url?: string) =>
  (url?.startsWith('/admin') ?? false) ||
  ((url?.startsWith('/perfil') ?? false) &&
    queryClient.getQueryData<AuthUser | null>(ME_QUERY_KEY)?.role === 'ADMINISTRADOR');

let refreshInFlight: Promise<unknown> | null = null;

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 403 && isAdminRequest(error.config?.url)) {
    // The role changed on the server: re-read the session so the admin guard reacts
    void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    throw error;
  }
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    throw error;
  }
  const original = error.config as InternalAxiosRequestConfig & {
    _retried?: boolean;
  };
  if (original._retried || NO_REFRESH_PATHS.some((path) => original.url?.startsWith(path))) {
    throw error;
  }
  original._retried = true;

  // Concurrent 401s share one refresh call: the refresh token rotates on each use
  refreshInFlight ??= api.post('/auth/refresh').finally(() => {
    refreshInFlight = null;
  });
  try {
    await refreshInFlight;
  } catch {
    if (isAdminRequest(original.url)) queryClient.setQueryData(ME_QUERY_KEY, null);
    throw error;
  }
  return api(original);
});

export const googleLoginUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/oauth2/authorization/google`;

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  fieldErrors: ApiFieldError[];
  message: string;
}
