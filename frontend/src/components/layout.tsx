import { Outlet } from 'react-router-dom';
import { Header } from '@/components/header';
import { LogoutNotice } from '@/components/logout-notice';

export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
      <LogoutNotice />
    </>
  );
}
