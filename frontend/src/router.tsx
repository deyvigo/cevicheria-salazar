import { createBrowserRouter } from 'react-router-dom';
import App from '@/App';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';

/**
 * Rutas base. Cada épica agrega las suyas aquí a medida que se implementa
 * (ver src/features/*): catalogo, carrito, checkout, perfil, admin (/admin/*).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/registro',
    element: <RegisterPage />,
  },
  {
    path: '/iniciar-sesion',
    element: <LoginPage />,
  },
]);
