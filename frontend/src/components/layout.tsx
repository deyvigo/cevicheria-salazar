import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header';
import { LogoutNotice } from '@/components/logout-notice';
import { CartAddedNotice } from '@/features/carrito/components/cart-added-notice';

export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <LogoutNotice />
      <CartAddedNotice />
    </>
  );
}
