import axios from 'axios';

/**
 * Instancia única de axios para toda la app. `withCredentials` es necesario
 * para que la cookie httpOnly del JWT viaje en cada request (ver
 * docs/diagrama-de-arquitectura.md y specs/ht-09-entorno/plan.md).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api',
  withCredentials: true,
});
