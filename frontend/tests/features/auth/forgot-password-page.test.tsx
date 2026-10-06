import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as authApi from '@/features/auth/auth-api';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';

vi.mock('@/features/auth/auth-api');

const CONFIRMATION = 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.';

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <ForgotPasswordPage />
      </QueryWrapper>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige el correo y no envía la solicitud si está vacío', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByText('El correo es obligatorio.')).toBeInTheDocument();
    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it('rechaza un correo con formato inválido', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'no-es-un-correo');
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByText('Ingresa un correo válido.')).toBeInTheDocument();
    expect(authApi.forgotPassword).not.toHaveBeenCalled();
  });

  it('en éxito reemplaza el formulario por el mensaje de confirmación del backend', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValue(CONFIRMATION);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByText(CONFIRMATION)).toBeInTheDocument();
    expect(authApi.forgotPassword).toHaveBeenCalledWith('maria@correo.com');
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument();
  });

  it('al superar el límite muestra el mensaje de espera como error de formulario', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValue(
      new AxiosError('Error', '429', undefined, undefined, {
        status: 429,
        data: {
          timestamp: new Date().toISOString(),
          status: 429,
          error: 'Demasiados intentos',
          fieldErrors: [],
          message: 'Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde.',
        },
      } as never),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Correo'), 'maria@correo.com');
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(
      await screen.findByText('Demasiadas solicitudes de recuperación. Inténtalo de nuevo más tarde.'),
    ).toBeInTheDocument();
  });

  it('permite volver al inicio de sesión', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute('href', '/iniciar-sesion');
  });
});
