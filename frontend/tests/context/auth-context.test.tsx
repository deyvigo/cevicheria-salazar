import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';

vi.mock('@/features/auth/auth-api');

function Probe() {
  const { user, isLoading } = useAuth();
  return (
    <>
      <p data-testid="loading">{String(isLoading)}</p>
      <p data-testid="user">{user ? user.email : 'sin sesión'}</p>
    </>
  );
}

function renderProbe() {
  return render(
    <QueryWrapper>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryWrapper>,
  );
}

describe('AuthProvider (recuperar sesión al abrir la app)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('deja al usuario con sesión cuando /me responde', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
    });

    renderProbe();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('maria@correo.com');
  });

  it('deja al usuario como Visitante cuando /me falla', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('sin sesión');
  });
});
