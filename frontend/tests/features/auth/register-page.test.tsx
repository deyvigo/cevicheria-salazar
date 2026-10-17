import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import { RegisterPage } from '@/features/auth/register-page';
import { useCartStore } from '@/features/carrito/cart-store';

vi.mock('@/features/auth/auth-api');

const CART = [
  { productId: 3, quantity: 2 },
  { productId: 7, quantity: 1 },
];

function Where() {
  const location = useLocation();
  return (
    <>
      <p data-testid="location">{location.pathname}</p>
      <p data-testid="location-state">{JSON.stringify(location.state)}</p>
    </>
  );
}

function renderPage(from?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/registro', state: from ? { from } : undefined }]}>
      <QueryWrapper>
        <AuthProvider>
          <RegisterPage />
          <Where />
        </AuthProvider>
      </QueryWrapper>
    </MemoryRouter>,
  );
}

async function fillValidFormExcept(user: ReturnType<typeof userEvent.setup>, skip: string[] = []) {
  const values: Record<string, string> = {
    Nombres: 'María',
    Apellidos: 'Quispe',
    Correo: 'maria@correo.com',
    Teléfono: '987654321',
    Contraseña: 'clave1234',
    'Confirmar contraseña': 'clave1234',
  };
  for (const [label, value] of Object.entries(values)) {
    if (skip.includes(label)) continue;
    await user.type(screen.getByLabelText(label), value);
  }
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('sin sesión'));
    vi.clearAllMocks();
    localStorage.clear();
    useCartStore.setState({ items: CART, lastAdded: null, lastRemoved: null });
  });

  it('muestra las condiciones de la contraseña', () => {
    renderPage();

    expect(screen.getByText('La contraseña debe cumplir:')).toBeInTheDocument();
    expect(screen.getByText('Incluir al menos un número.')).toBeInTheDocument();
  });

  it('muestra los campos obligatorios vacíos al enviar sin completar nada', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El apellido es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El correo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('El teléfono es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user, ['Correo']);
    await user.type(screen.getByLabelText('Correo'), 'no-es-un-correo');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
  });

  it('rechaza un teléfono que no tiene 9 dígitos o no empieza con 9', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user, ['Teléfono']);
    await user.type(screen.getByLabelText('Teléfono'), '123456789');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Ingresa un teléfono de 9 dígitos que empiece con 9.')).toBeInTheDocument();
  });

  it('rechaza una contraseña sin número', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user, ['Contraseña', 'Confirmar contraseña']);
    await user.type(screen.getByLabelText('Contraseña'), 'sololetras');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'sololetras');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres, con letras y números.'),
    ).toBeInTheDocument();
  });

  it('rechaza cuando la confirmación no coincide con la contraseña', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user, ['Confirmar contraseña']);
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otraClave123');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('en éxito actualiza la sesión y muestra el toast de confirmación', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
      hasPassword: true,
    });
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Tu cuenta fue creada')).toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual(CART);
  });

  it('tras registrarse vuelve a la pantalla de origen y no al inicio', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      id: 1,
      email: 'maria@correo.com',
      firstName: 'María',
      lastName: 'Quispe',
      phone: '987654321',
      role: 'CLIENTE',
      hasPassword: true,
    });
    const user = userEvent.setup();
    renderPage('/cart');

    await fillValidFormExcept(user);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cart'), { timeout: 3000 });
  });

  it('el enlace a iniciar sesión conserva la pantalla de origen', async () => {
    const user = userEvent.setup();
    renderPage('/cart');

    await user.click(screen.getByRole('link', { name: 'Inicia sesión' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/iniciar-sesion');
    expect(screen.getByTestId('location-state')).toHaveTextContent('"from":"/cart"');
  });

  it('en correo duplicado muestra el error devuelto por la API bajo el campo de correo', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        data: {
          timestamp: new Date().toISOString(),
          status: 409,
          error: 'Conflicto',
          fieldErrors: [{ field: 'email', message: 'Este correo ya está registrado.' }],
          message: 'Este correo ya está registrado.',
        },
      } as never),
    );
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Este correo ya está registrado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Correo')).toHaveValue('maria@correo.com'));
  });

  it('incluye el botón de Google, igual que en LoginPage', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /continuar con google/i })).toBeInTheDocument();
    expect(
      screen
        .getByRole('link', { name: /continuar con google/i })
        .compareDocumentPosition(screen.getByRole('separator', { name: 'o regístrate con tu correo' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('ofrece ir a iniciar sesión cuando ya se tiene una cuenta', () => {
    renderPage();

    expect(screen.getByText(/¿Ya tienes cuenta\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/iniciar-sesion');
  });
});
