import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

/**
 * Instancia única de axios para toda la app. `withCredentials` es necesario
 * para que la cookie httpOnly del JWT viaje en cada request (ver
 * docs/diagrama-de-arquitectura.md y specs/ht-09-entorno/plan.md).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * Las rutas de OAuth2 de Spring Security (HU-06) no están bajo el prefijo
 * `/api` de nuestros propios controladores, así que no son una llamada de
 * axios: es una navegación completa de página a esta URL.
 */
export const googleLoginUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/oauth2/authorization/google`;

/** Forma de error de la API (`ApiError` en el backend, ver common/exception). */
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
