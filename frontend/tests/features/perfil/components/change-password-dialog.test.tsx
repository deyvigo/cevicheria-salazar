import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordDialog } from '@/features/perfil/components/change-password-dialog';
import * as profileApi from '@/features/perfil/profile-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/profile-api');

function renderDialog(hasPassword = true, onSaved = vi.fn()) {
  const tree = (open: boolean) => (
    <QueryWrapper>
      <ChangePasswordDialog open={open} hasPassword={hasPassword} onClose={() => {}} onSaved={onSaved} />
    </QueryWrapper>
  );
  const view = render(tree(true));
  return { onSaved, view, tree };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

async function fill(current: string | null, next: string, confirm: string) {
  const user = userEvent.setup();
  if (current !== null) await user.type(await screen.findByLabelText('Contraseña actual'), current);
  await user.type(await screen.findByLabelText('Nueva contraseña'), next);
  await user.type(screen.getByLabelText('Confirmar contraseña'), confirm);
  await user.click(screen.getByRole('button', { name: 'Guardar' }));
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('con contraseña pide la actual y se titula "Cambiar contraseña"', async () => {
    renderDialog(true);

    expect(await screen.findByRole('dialog', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument();
  });

  it('sin contraseña no pide la actual y se titula "Crear contraseña"', async () => {
    renderDialog(false);

    expect(await screen.findByRole('dialog', { name: 'Crear contraseña' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
  });

  it('no envía si incumple las reglas o no coincide', async () => {
    renderDialog();

    await fill('clave1234', 'corta', 'otra');

    expect(await screen.findByText(/al menos 8 caracteres/)).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(profileApi.changePassword).not.toHaveBeenCalled();
  });

  it('no envía si la nueva es igual a la actual', async () => {
    renderDialog();

    await fill('clave1234', 'clave1234', 'clave1234');

    expect(await screen.findByText('La nueva contraseña debe ser distinta de la actual.')).toBeInTheDocument();
    expect(profileApi.changePassword).not.toHaveBeenCalled();
  });

  it('guarda y avisa al terminar', async () => {
    vi.mocked(profileApi.changePassword).mockResolvedValue();
    const { onSaved } = renderDialog();

    await fill('clave1234', 'nueva5678', 'nueva5678');

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(profileApi.changePassword).toHaveBeenCalledWith({ currentPassword: 'clave1234', newPassword: 'nueva5678' });
  });

  it('una cuenta sin contraseña envía solo la nueva', async () => {
    vi.mocked(profileApi.changePassword).mockResolvedValue();
    const { onSaved } = renderDialog(false);

    await fill(null, 'nueva5678', 'nueva5678');

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(profileApi.changePassword).toHaveBeenCalledWith({ currentPassword: undefined, newPassword: 'nueva5678' });
  });

  it('muestra el error de la contraseña actual en su campo', async () => {
    vi.mocked(profileApi.changePassword).mockRejectedValue(
      serverError(400, { fieldErrors: [{ field: 'currentPassword', message: 'La contraseña actual no es correcta.' }] }),
    );
    const { onSaved } = renderDialog();

    await fill('mala1234', 'nueva5678', 'nueva5678');

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de bloqueo ante un 429', async () => {
    vi.mocked(profileApi.changePassword).mockRejectedValue(
      serverError(429, { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }),
    );
    renderDialog();

    await fill('clave1234', 'nueva5678', 'nueva5678');

    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
  });

  it('deja los campos vacíos al reabrir', async () => {
    const { view, tree } = renderDialog();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Nueva contraseña'), 'algo1234');

    view.rerender(tree(false));
    view.rerender(tree(true));

    expect(await screen.findByLabelText('Nueva contraseña')).toHaveValue('');
  });
});
