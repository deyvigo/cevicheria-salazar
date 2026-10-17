import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { AdminGuard } from '@/features/admin/admin-guard';
import { AdminLayout } from '@/features/admin/admin-layout';
import { AdminNotFound } from '@/features/admin/admin-not-found';
import { ADMIN_SECTIONS } from '@/features/admin/admin-sections';
import { AdminSectionPage } from '@/features/admin/components/admin-section-page';
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
    path: '/admin',
    element: <AdminGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={`/admin/${ADMIN_SECTIONS[0].path}`} replace /> },
          ...ADMIN_SECTIONS.map((section) => ({
            path: section.path,
            element: <AdminSectionPage title={section.label} />,
          })),
          { path: '*', element: <AdminNotFound /> },
        ],
      },
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
