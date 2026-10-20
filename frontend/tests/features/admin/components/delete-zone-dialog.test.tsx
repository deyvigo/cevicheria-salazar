import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as zoneApi from '@/features/admin/admin-delivery-zone-api';
import { DeleteZoneDialog } from '@/features/admin/components/delete-zone-dialog';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-delivery-zone-api');

const zone = { id: 5, name: 'Miraflores', price: 8, color: 'celeste' as const, active: true, coordinates: [] };

function renderDialog(onClose = vi.fn(), onDeleted = vi.fn()) {
  render(
    <QueryWrapper>
      <DeleteZoneDialog zone={zone} onClose={onClose} onDeleted={onDeleted} />
    </QueryWrapper>,
  );
  return { onClose, onDeleted };
}

describe('DeleteZoneDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra el nombre de la zona a eliminar', () => {
    renderDialog();

    expect(screen.getByText('Miraflores')).toBeInTheDocument();
  });

  it('al confirmar elimina y avisa', async () => {
    vi.mocked(zoneApi.deleteDeliveryZone).mockResolvedValue();
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(zone));
    expect(zoneApi.deleteDeliveryZone).toHaveBeenCalledWith(5);
  });

  it('cancelar y Escape cierran sin eliminar', async () => {
    const { onClose } = renderDialog();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(zoneApi.deleteDeliveryZone).not.toHaveBeenCalled();
  });

  it('si falla muestra el error y no avisa', async () => {
    vi.mocked(zoneApi.deleteDeliveryZone).mockRejectedValue(new Error('x'));
    const { onDeleted } = renderDialog();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('No pudimos eliminar la zona, intenta de nuevo.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
