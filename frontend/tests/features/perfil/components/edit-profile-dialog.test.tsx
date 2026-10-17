import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/context/auth-context';
import { EditProfileDialog } from '@/features/perfil/components/edit-profile-dialog';
import * as profileApi from '@/features/perfil/profile-api';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/profile-api');

const maria: AuthUser = {
  id: 1,
  email: 'maria@correo.com',
  firstName: 'María',
  lastName: 'Quispe',
  phone: '987654321',
  role: 'CLIENTE',
  hasPassword: true,
};

function renderDialog(onClose = vi.fn(), onSaved = vi.fn()) {
  const view = render(
    <QueryWrapper>
      <EditProfileDialog open user={maria} onClose={onClose} onSaved={onSaved} />
    </QueryWrapper>,
  );
  return { onClose, onSaved, view };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

describe('EditProfileDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('carga los valores guardados y deshabilita "Guardar" sin cambios', async () => {
    renderDialog();

    expect(await screen.findByLabelText('Nombres')).toHaveValue('María');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Quispe');
    expect(screen.getByLabelText('Teléfono')).toHaveValue('987654321');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('no envía con campos vacíos o con teléfono inválido', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.clear(await screen.findByLabelText('Nombres'));
    await user.clear(screen.getByLabelText('Teléfono'));
    await user.type(screen.getByLabelText('Teléfono'), '812345678');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un teléfono de 9 dígitos que empiece con 9.')).toBeInTheDocument();
    expect(profileApi.updateProfile).not.toHaveBeenCalled();
  });

  it('guarda los cambios y avisa al terminar', async () => {
    const user = userEvent.setup();
    vi.mocked(profileApi.updateProfile).mockResolvedValue({ ...maria, firstName: 'Ana' });
    const { onSaved } = renderDialog();

    const firstName = await screen.findByLabelText('Nombres');
    await user.clear(firstName);
    await user.type(firstName, '  Ana ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(profileApi.updateProfile).toHaveBeenCalledWith({ firstName: 'Ana', lastName: 'Quispe', phone: '987654321' });
  });

  it('con un error del servidor conserva las ediciones y muestra el mensaje', async () => {
    const user = userEvent.setup();
    vi.mocked(profileApi.updateProfile).mockRejectedValue(serverError(500, {}));
    const { onSaved } = renderDialog();

    const firstName = await screen.findByLabelText('Nombres');
    await user.clear(firstName);
    await user.type(firstName, 'Ana');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('No pudimos guardar tus datos, intenta de nuevo.')).toBeInTheDocument();
    expect(firstName).toHaveValue('Ana');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('muestra el error de campo que devuelve el servidor', async () => {
    const user = userEvent.setup();
    vi.mocked(profileApi.updateProfile).mockRejectedValue(
      serverError(400, { fieldErrors: [{ field: 'phone', message: 'Teléfono no válido.' }] }),
    );
    renderDialog();

    const firstName = await screen.findByLabelText('Nombres');
    await user.type(firstName, 'x');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Teléfono no válido.')).toBeInTheDocument();
  });

  it('Cancelar cierra sin guardar', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
    expect(profileApi.updateProfile).not.toHaveBeenCalled();
  });

  it('al reabrir restaura los valores guardados', async () => {
    const user = userEvent.setup();
    const view = render(
      <QueryWrapper>
        <EditProfileDialog open user={maria} onClose={() => {}} onSaved={() => {}} />
      </QueryWrapper>,
    );
    const firstName = await screen.findByLabelText('Nombres');
    await user.clear(firstName);
    await user.type(firstName, 'Otro');

    view.rerender(
      <QueryWrapper>
        <EditProfileDialog open={false} user={maria} onClose={() => {}} onSaved={() => {}} />
      </QueryWrapper>,
    );
    view.rerender(
      <QueryWrapper>
        <EditProfileDialog open user={maria} onClose={() => {}} onSaved={() => {}} />
      </QueryWrapper>,
    );

    expect(await screen.findByLabelText('Nombres')).toHaveValue('María');
  });
});
