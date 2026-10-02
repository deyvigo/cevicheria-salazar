import { createBrowserRouter } from 'react-router-dom';
import App from '@/App';

/**
 * Rutas base. Cada épica agrega las suyas aquí a medida que se implementa
 * (ver src/features/*): auth (/registro, /iniciar-sesion), catalogo, carrito,
 * checkout, perfil, admin (/admin/*).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
]);
