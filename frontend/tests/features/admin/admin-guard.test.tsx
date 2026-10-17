import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import { AdminGuard } from '@/features/admin/admin-guard';
import { useAdminSession } from '@/features/admin/admin-session';
import * as authApi from '@/features/auth/auth-api';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';

vi.mock('@/features/auth/auth-api');

const admin: AuthUser = {
  id: 1,
  email: 'admin@correo.com',
  firstName: 'Admin',
  lastName: 'Salazar',
  phone: '987654321',
  role: 'ADMINISTRADOR',
  hasPassword: true,
};

function SignOutButton() {
  const { signOut } = useAdminSession();
  return <button onClick={() => signOut().catch(() => {})}>Salir</button>;
}

function renderGuard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <AdminGuard />,
        children: [{ index: true, element: <SignOutButton /> }],
      },
      { path: '/', element: <p>Inicio</p> },
      { path: '/iniciar-sesion', element: <p>Login</p> },
    ],
    { initialEntries: ['/admin'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { queryClient, router };
}

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('no muestra nada mientras se confirma la sesión', () => {
    vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
    renderGuard();

    expect(screen.queryByRole('heading', { name: 'Página no encontrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument();
  });

  it('deja pasar al administrador', async () => {
    vi.mocked(authApi.me).mockResolvedValue(admin);
    renderGuard();

    expect(await screen.findByRole('button', { name: 'Salir' })).toBeInTheDocument();
  });

  it('muestra 404, sin redirigir al login, a un cliente', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ ...admin, role: 'CLIENTE' });
    const { router } = renderGuard();

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('muestra 404, sin redirigir al login, a un visitante', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    const { router } = renderGuard();

    expect(await screen.findByRole('heading', { name: 'Página no encontrada' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('si la sesión del administrador se pierde con el panel abierto, va al login', async () => {
    vi.mocked(authApi.me).mockResolvedValue(admin);
    const { queryClient, router } = renderGuard();
    await screen.findByRole('button', { name: 'Salir' });

    act(() => queryClient.setQueryData(ME_QUERY_KEY, null));

    await waitFor(() => expect(router.state.location.pathname).toBe('/iniciar-sesion'));
  });

  it('cerrar sesión desde el panel lleva al inicio y no al login', async () => {
    vi.mocked(authApi.me).mockResolvedValue(admin);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    const { router } = renderGuard();

    await user.click(await screen.findByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(router.state.location.state).toEqual({ loggedOut: true });
  });

  it('si el cierre de sesión falla, el administrador sigue en el panel', async () => {
    vi.mocked(authApi.me).mockResolvedValue(admin);
    vi.mocked(authApi.logout).mockRejectedValue(new Error('red caída'));
    const user = userEvent.setup();
    const { router } = renderGuard();

    await user.click(await screen.findByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(authApi.logout).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Salir' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
  });
});
