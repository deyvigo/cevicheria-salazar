import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type AuthUser } from '@/context/auth-context';
import * as authApi from '@/features/auth/auth-api';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';
import { useCartStore } from '@/features/carrito/cart-store';
import { CheckoutGuard } from '@/features/checkout/checkout-guard';
import { useCheckoutStore } from '@/features/checkout/checkout-store';

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

function renderGuard() {
  const router = createMemoryRouter(
    [
      { path: '/cart', element: <p>carrito</p> },
      {
        path: '/checkout/direcciones',
        element: (
          <CheckoutGuard>
            <p>entrega</p>
          </CheckoutGuard>
        ),
      },
    ],
    { initialEntries: ['/checkout/direcciones'] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  vi.mocked(authApi.me).mockReset().mockResolvedValue(maria);
  localStorage.clear();
  useCartStore.setState({ items: [{ productId: 1, quantity: 1 }] });
  useCheckoutStore.getState().reset();
  useCheckoutStore.getState().enter();
});

describe('CheckoutGuard', () => {
  it('con sesión, paso iniciado y platos muestra el paso', async () => {
    renderGuard();

    expect(await screen.findByText('entrega')).toBeInTheDocument();
  });

  it('sin haber pasado por "Continuar" redirige al carrito', async () => {
    useCheckoutStore.getState().reset();
    renderGuard();

    expect(await screen.findByText('carrito')).toBeInTheDocument();
  });

  it('un visitante es llevado al carrito', async () => {
    vi.mocked(authApi.me).mockResolvedValue(null as unknown as AuthUser);
    renderGuard();

    expect(await screen.findByText('carrito')).toBeInTheDocument();
  });

  it('con el carrito vacío redirige al carrito', async () => {
    useCartStore.setState({ items: [] });
    renderGuard();

    expect(await screen.findByText('carrito')).toBeInTheDocument();
  });

  it('mientras se verifica la sesión no muestra nada ni redirige', () => {
    vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
    renderGuard();

    expect(screen.queryByText('entrega')).not.toBeInTheDocument();
    expect(screen.queryByText('carrito')).not.toBeInTheDocument();
  });

  it('si la sesión expira redirige al carrito', async () => {
    const client = renderGuard();
    await screen.findByText('entrega');

    act(() => client.setQueryData(ME_QUERY_KEY, null));

    expect(await screen.findByText('carrito')).toBeInTheDocument();
  });
});
