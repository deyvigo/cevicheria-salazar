import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header';
import { LogoutNotice } from '@/components/logout-notice';
import { CartNotice } from '@/features/carrito/components/cart-notice';

export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <LogoutNotice />
      <CartNotice />
    </>
  );
}
