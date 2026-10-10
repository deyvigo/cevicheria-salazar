import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { CatalogPage } from '@/features/catalogo/catalog-page';
import { HomeRedirect } from '@/features/catalogo/home-redirect';
import { ProductDetailPage } from '@/features/catalogo/product-detail-page';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      { path: '/:category', element: <CatalogPage /> },
      { path: '/products/:id', element: <ProductDetailPage /> },
    ],
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
