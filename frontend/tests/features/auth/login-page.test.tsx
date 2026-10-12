import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import { LoginPage } from '@/features/auth/login-page';
import { useCartStore } from '@/features/carrito/cart-store';

vi.mock('@/features/auth/auth-api');

const CART = [
  { productId: 3, quantity: 2 },
  { productId: 7, quantity: 1 },
];

function Harness() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <>
      <LoginPage />
      <p data-testid="location">{location.pathname + location.search}</p>
      <p data-testid="location-state">{JSON.stringify(location.state)}</p>
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
    localStorage.clear();
    useCartStore.setState({ items: CART, lastAdded: null, lastRemoved: null });
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
    expect(useCartStore.getState().items).toEqual(CART);
  });

  it('tras iniciar sesión vuelve a la pantalla de origen y no al inicio', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
    });
    const user = userEvent.setup();
    renderPage([{ pathname: '/iniciar-sesion', state: { from: '/cart' } }]);

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cart'));
  });

  it('sin pantalla de origen o con una insegura va al inicio', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
    });
    const user = userEvent.setup();
    renderPage([{ pathname: '/iniciar-sesion', state: { from: '//malo.com' } }]);

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
  });

  it('con credenciales inválidas se queda en la pantalla de inicio de sesión', async () => {
    vi.mocked(authApi.login).mockRejectedValue(apiError(401, 'Correo o contraseña incorrectos.'));
    const user = userEvent.setup();
    renderPage([{ pathname: '/iniciar-sesion', state: { from: '/cart' } }]);

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/iniciar-sesion');
  });

  it('el enlace a registrarse conserva la pantalla de origen', async () => {
    const user = userEvent.setup();
    renderPage([{ pathname: '/iniciar-sesion', state: { from: '/cart' } }]);

    await user.click(screen.getByRole('link', { name: 'Regístrate' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/registro');
    expect(screen.getByTestId('location-state')).toHaveTextContent('"from":"/cart"');
  });

  it('con el carrito vacío, iniciar sesión no introduce platos', async () => {
    useCartStore.setState({ items: [] });
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
    expect(useCartStore.getState().items).toEqual([]);
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
    expect(useCartStore.getState().items).toEqual(CART);
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
    expect(useCartStore.getState().items).toEqual(CART);
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
