import { createBrowserRouter } from 'react-router-dom';
import App from '@/app';
import { Layout } from '@/components/layout';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';

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
  {
    path: '/olvide-contrasena',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/restablecer-contrasena',
    element: <ResetPasswordPage />,
  },
]);
