import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/context/AuthContext';
import * as authApi from './authApi';
import { RegisterPage } from './RegisterPage';

vi.mock('./authApi');

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
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
    });
    const user = userEvent.setup();
    renderPage();

    await fillValidFormExcept(user);
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Tu cuenta fue creada')).toBeInTheDocument();
  });

  it('en correo duplicado muestra el error devuelto por la API bajo el campo de correo', async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new AxiosError(
        'Conflict',
        '409',
        undefined,
        undefined,
        {
          status: 409,
          data: {
            timestamp: new Date().toISOString(),
            status: 409,
            error: 'Conflicto',
            fieldErrors: [{ field: 'email', message: 'Este correo ya está registrado.' }],
            message: 'Este correo ya está registrado.',
          },
        } as never,
      ),
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
  });
});
