import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '@/components/header';
import { AuthProvider, useAuth, type AuthUser } from '@/context/auth-context';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';

vi.mock('@/features/auth/auth-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
};

function CurrentUser() {
  const { user } = useAuth();
  return <p data-testid="current-user">{user ? user.email : 'sin sesión'}</p>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <QueryWrapper>
        <AuthProvider>
          <Header />
          <CurrentUser />
          <Routes>
            <Route path="/" element={<p>Inicio</p>} />
          </Routes>
        </AuthProvider>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra "Iniciar sesión" y no el menú cuando no hay sesión', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('401'));
    renderHeader();

    expect(await screen.findByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /María/ })).not.toBeInTheDocument();
  });

  it('no muestra ni el botón ni el nombre mientras se confirma la sesión', () => {
    vi.mocked(authApi.me).mockReturnValue(new Promise(() => {}));
    renderHeader();

    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /María/ })).not.toBeInTheDocument();
  });

  it('con sesión muestra el nombre y abre el menú al hacer clic; Escape lo cierra y devuelve el foco', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    const user = userEvent.setup();
    renderHeader();

    const trigger = await screen.findByRole('button', { name: /María/ });
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('cierra el menú al hacer clic fuera', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    const user = userEvent.setup();
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /María/ }));
    await user.click(screen.getByText('Inicio'));

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('al cerrar sesión llama al backend, limpia el usuario y vuelve al inicio', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /María/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(screen.getByTestId('current-user')).toHaveTextContent('sin sesión'));
    expect(authApi.logout).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('si el servidor falla conserva la sesión y muestra el error', async () => {
    vi.mocked(authApi.me).mockResolvedValue(maria);
    vi.mocked(authApi.logout).mockRejectedValue(new Error('Network Error'));
    const user = userEvent.setup();
    renderHeader();

    await user.click(await screen.findByRole('button', { name: /María/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cerrar tu sesión');
    expect(screen.getByTestId('current-user')).toHaveTextContent('maria@correo.com');
    expect(screen.getByRole('button', { name: /María/ })).toBeInTheDocument();
  });
});
