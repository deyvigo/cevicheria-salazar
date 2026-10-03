import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as authApi from './authApi';
import { LoginPage } from './LoginPage';

vi.mock('./authApi');

/** Expone el usuario de la sesión para comprobar que setUser(...) se llamó con los datos correctos. */
function Harness() {
  const { user } = useAuth();
  return (
    <>
      <LoginPage />
      <p data-testid="current-user">{user ? user.email : 'sin sesión'}</p>
    </>
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Harness />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function apiError(status: number, message: string) {
  return new AxiosError('Error', String(status), undefined, undefined, {
    status,
    data: {
      timestamp: new Date().toISOString(),
      status,
      error: 'Error',
      fieldErrors: [],
      message,
    },
  } as never);
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los campos obligatorios vacíos al enviar sin completar nada', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('El correo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'no-es-un-correo');
    await user.type(screen.getByLabelText('Contraseña'), 'cualquier-cosa');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
  });

  it('en éxito actualiza la sesión con el usuario que devuelve la API', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByTestId('current-user')).toHaveTextContent('maria@correo.com');
  });

  it('en credenciales inválidas muestra el mensaje genérico a nivel de formulario', async () => {
    vi.mocked(authApi.login).mockRejectedValue(apiError(401, 'Correo o contraseña incorrectos.'));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    // no queda asociado a un campo: sigue en "sin sesión".
    expect(screen.getByTestId('current-user')).toHaveTextContent('sin sesión');
  });

  it('tras bloquearse por intentos fallidos muestra el mensaje distinto que devuelve la API', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      apiError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(
      await screen.findByText('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });
});
