import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import { OrderResultGuard } from '@/features/checkout/order-result-guard';

vi.mock('@/features/auth/auth-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

function Login() {
  const location = useLocation();
  return <p>login desde {(location.state as { from?: string } | null)?.from}</p>;
}

function renderGuard() {
  const router = createMemoryRouter(
    [
      { path: '/iniciar-sesion', element: <Login /> },
      {
        path: '/checkout/resultado',
        element: (
          <OrderResultGuard>
            <p>resultado</p>
          </OrderResultGuard>
        ),
      },
    ],
    { initialEntries: ['/checkout/resultado?pedido=42'] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(authApi.me).mockReset().mockResolvedValue(maria);
});

describe('OrderResultGuard', () => {
  it('un cliente con sesión ve la pantalla aunque el checkout esté vacío', async () => {
    renderGuard();

    expect(await screen.findByText('resultado')).toBeInTheDocument();
  });

  it('sin sesión lleva a iniciar sesión y recuerda la URL completa con el pedido', async () => {
    vi.mocked(authApi.me).mockResolvedValue(null as unknown as AuthUser);
    renderGuard();

    expect(await screen.findByText('login desde /checkout/resultado?pedido=42')).toBeInTheDocument();
  });

  it('un administrador no ve la pantalla', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ ...maria, role: 'ADMINISTRADOR' });
    renderGuard();

    await screen.findByText(/no encontr|404|página/i);
    expect(screen.queryByText('resultado')).not.toBeInTheDocument();
  });

  it('mientras se verifica la sesión no muestra nada ni redirige', () => {
    vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
    renderGuard();

    expect(screen.queryByText('resultado')).not.toBeInTheDocument();
    expect(screen.queryByText(/login desde/)).not.toBeInTheDocument();
  });
});
