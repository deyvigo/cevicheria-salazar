import { createBrowserRouter } from 'react-router-dom';
import App from '@/app';
import { Layout } from '@/components/layout';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [{ path: '/', element: <App /> }],
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
