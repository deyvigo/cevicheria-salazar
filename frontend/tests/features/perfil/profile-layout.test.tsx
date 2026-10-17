import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from '@/components/layout';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import * as addressApi from '@/features/perfil/address-api';
import { MyAddressesPage } from '@/features/perfil/my-addresses-page';
import { MyInformationPage } from '@/features/perfil/my-information-page';
import { ProfileGuard } from '@/features/perfil/profile-guard';
import { ProfileLayout } from '@/features/perfil/profile-layout';
import { ProfileNotFound } from '@/features/perfil/profile-not-found';
import { Navigate } from 'react-router-dom';

vi.mock('@/features/auth/auth-api');
vi.mock('@/features/perfil/address-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          {
            path: '/perfil',
            element: <ProfileGuard />,
            children: [
              {
                element: <ProfileLayout />,
                children: [
                  { index: true, element: <Navigate to="/perfil/mi-informacion" replace /> },
                  { path: 'mi-informacion', element: <MyInformationPage /> },
                  { path: 'mis-direcciones', element: <MyAddressesPage /> },
                  { path: '*', element: <ProfileNotFound /> },
                ],
              },
            ],
          },
          { path: '/', element: <p>Inicio</p> },
        ],
      },
      { path: '/iniciar-sesion', element: <p>Login</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('Perfil', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('redirige /perfil a "Mi información" y mantiene el header junto a la navegación', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    const router = renderAt('/perfil');

    expect(await screen.findByRole('heading', { name: 'Mi información' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/perfil/mi-informacion');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mi información' })).toHaveAttribute('aria-current', 'page');
  });

  it('muestra "Página no encontrada" dentro del perfil, con la navegación', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    renderAt('/perfil/otra');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Perfil' })).toBeInTheDocument();
  });

  it('no muestra nada mientras se confirma la sesión', () => {
    vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
    renderAt('/perfil/mi-informacion');

    expect(screen.queryByRole('navigation', { name: 'Perfil' })).not.toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
  });

  it('lleva a iniciar sesión a un visitante, recordando el perfil', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    const router = renderAt('/perfil/mi-informacion');

    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: '/perfil/mi-informacion' });
  });

  it('abre "Mis direcciones" por su URL con la pestaña activa', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    vi.mocked(addressApi.listAddresses).mockResolvedValue([]);
    renderAt('/perfil/mis-direcciones');

    expect(await screen.findByRole('heading', { name: 'Mis direcciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis direcciones' })).toHaveAttribute('aria-current', 'page');
  });

  it('lleva a iniciar sesión a un visitante de "Mis direcciones", recordando la pestaña', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    const router = renderAt('/perfil/mis-direcciones');

    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: '/perfil/mis-direcciones' });
  });

  it('muestra la página 404 a un administrador', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ ...maria, role: 'ADMINISTRADOR' });
    renderAt('/perfil/mi-informacion');

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Perfil' })).not.toBeInTheDocument();
  });

  it('cerrar sesión desde el header estando en el perfil termina en la tienda, no en el login', async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.me).mockResolvedValue(maria);
    vi.mocked(authApi.logout).mockResolvedValue();
    const router = renderAt('/perfil/mi-informacion');

    await user.click(await screen.findByRole('button', { name: /María/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await screen.findByText('Inicio');
    expect(router.state.location.pathname).toBe('/');
  });
});
