import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';

/** Páginas de la tienda con header. Login y registro quedan fuera: son pantallas de formulario. */
export function Layout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
