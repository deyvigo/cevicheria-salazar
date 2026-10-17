import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header';
import { LogoutNotice } from '@/components/logout-notice';
import { ReturnPathRedirect } from '@/components/return-path-redirect';
import { CartNotice } from '@/features/carrito/components/cart-notice';

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <Outlet />
      <LogoutNotice />
      <ReturnPathRedirect />
      <CartNotice />
    </div>
  );
}
