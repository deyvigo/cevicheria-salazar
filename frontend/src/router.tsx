import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { CartPage } from '@/features/carrito/cart-page';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { CatalogPage } from '@/features/catalogo/catalog-page';
import { ProductDetailPage } from '@/features/catalogo/product-detail-page';
import { HomePage } from '@/features/home/home-page';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/menu', element: <CatalogPage /> },
      { path: '/menu/:category', element: <CatalogPage /> },
      { path: '/products/:id', element: <ProductDetailPage /> },
      { path: '/cart', element: <CartPage /> },
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
