import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import { LoginPage } from '@/features/auth/login-page';

vi.mock('@/features/auth/auth-api');

function Harness() {
  const { user } = useAuth();
  return (
    <>
      <LoginPage />
      <p data-testid="current-user">{user ? user.email : 'sin sesión'}</p>
    </>
  );
}

function renderPage(initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/iniciar-sesion']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryWrapper>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </QueryWrapper>
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
    vi.mocked(authApi.me).mockRejectedValue(new Error('sin sesión'));
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

  it('muestra el error de Google cuando la URL trae ?error=google (HU-06)', async () => {
    renderPage(['/iniciar-sesion?error=google']);

    expect(await screen.findByText('No pudimos iniciar sesión con Google. Intenta de nuevo.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('incluye el botón de Google, igual que en RegisterPage', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /continuar con google/i })).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: /continuar con google/i })
        .compareDocumentPosition(screen.getByRole('separator', { name: 'o inicia con tu correo' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('ofrece ir a crear una cuenta cuando no se tiene una', async () => {
    render(
      <MemoryRouter initialEntries={['/iniciar-sesion']}>
        <QueryWrapper>
          <AuthProvider>
            <Routes>
              <Route path="/iniciar-sesion" element={<LoginPage />} />
              <Route path="/registro" element={<p>Pantalla de registro</p>} />
            </Routes>
          </AuthProvider>
        </QueryWrapper>
      </MemoryRouter>,
    );

    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Regístrate' }));

    expect(screen.getByText('Pantalla de registro')).toBeInTheDocument();
  });

  it('ofrece ir a recuperar la contraseña', () => {
    renderPage();

    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/olvide-contrasena',
    );
  });

  it('muestra el aviso de éxito cuando viene de restablecer la contraseña', () => {
    renderPage([{ pathname: '/iniciar-sesion', state: { passwordReset: true } }]);

    expect(screen.getByText('Tu contraseña fue actualizada. Inicia sesión.')).toBeInTheDocument();
  });

  it('no muestra el aviso de éxito en una visita normal', () => {
    renderPage();

    expect(screen.queryByText('Tu contraseña fue actualizada. Inicia sesión.')).not.toBeInTheDocument();
  });
});
