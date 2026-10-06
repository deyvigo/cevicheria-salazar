import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshInFlight: Promise<unknown> | null = null;

api.interceptors.response.use(undefined, async (error: unknown) => {
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
