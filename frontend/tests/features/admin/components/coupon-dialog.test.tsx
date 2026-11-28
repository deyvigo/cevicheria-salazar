import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as couponApi from '@/features/admin/admin-coupon-api';
import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { CouponDialog } from '@/features/admin/components/coupon-dialog';
import { couponOf } from '@tests/features/admin/coupon-fixtures';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-coupon-api');

function renderDialog(coupon?: AdminCoupon, onSaved = vi.fn()) {
  render(
    <QueryWrapper>
      <CouponDialog open coupon={coupon} onClose={vi.fn()} onSaved={onSaved} />
    </QueryWrapper>,
  );
  return { onSaved };
}

function serverError(status: number, data: object) {
  return new AxiosError('fail', 'ERR', undefined, undefined, { status, data } as never);
}

const save = () => screen.getByRole('button', { name: 'Guardar' });

describe('CouponDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('crea un cupón con el código en mayúsculas y sin límites si se dejan vacíos', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.createCoupon).mockResolvedValue(couponOf());
    const { onSaved } = renderDialog();

    expect(screen.getByRole('heading', { name: 'Agregar cupón' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Activo' })).toBeChecked();
    await user.type(screen.getByLabelText('Código'), '  ceviche10 ');
    await user.type(screen.getByLabelText('Valor (%)'), '10');
    await user.click(save());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Cupón agregado'));
    expect(couponApi.createCoupon).toHaveBeenCalledWith({
      code: 'CEVICHE10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minSubtotal: null,
      maxUses: null,
      maxUsesPerCustomer: null,
      startsOn: null,
      endsOn: null,
      active: true,
    });
  });

  it('con monto fijo envía usos por persona, cupos, compra mínima y vigencia', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.createCoupon).mockResolvedValue(couponOf());
    renderDialog();

    await user.type(screen.getByLabelText('Código'), 'BIENVENIDA5');
    await user.click(screen.getByLabelText('Monto fijo'));
    await user.type(screen.getByLabelText('Valor (S/)'), '5.50');
    await user.type(screen.getByLabelText('Usos por persona'), '1');
    await user.type(screen.getByLabelText('Cupos'), '50');
    await user.type(screen.getByLabelText('Compra mínima (S/)'), '30');
    await user.type(screen.getByLabelText('Desde'), '2026-12-01');
    await user.type(screen.getByLabelText('Hasta'), '2026-12-31');
    await user.click(screen.getByRole('switch', { name: 'Activo' }));
    await user.click(save());

    await waitFor(() =>
      expect(couponApi.createCoupon).toHaveBeenCalledWith({
        code: 'BIENVENIDA5',
        discountType: 'FIXED',
        discountValue: 5.5,
        minSubtotal: 30,
        maxUses: 50,
        maxUsesPerCustomer: 1,
        startsOn: '2026-12-01',
        endsOn: '2026-12-31',
        active: false,
      }),
    );
  });

  it('muestra cada error bajo su campo y no envía', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Código'), 'con espacio');
    await user.type(screen.getByLabelText('Valor (%)'), '120');
    await user.type(screen.getByLabelText('Usos por persona'), '1.5');
    await user.type(screen.getByLabelText('Cupos'), '0');
    await user.type(screen.getByLabelText('Desde'), '2026-12-10');
    await user.type(screen.getByLabelText('Hasta'), '2026-12-09');
    await user.click(save());

    expect(await screen.findByText('Usa solo letras, números, guiones y guiones bajos.')).toBeInTheDocument();
    expect(screen.getByText('El porcentaje no puede ser mayor que 100.')).toBeInTheDocument();
    expect(screen.getByText('Los usos por persona deben ser un número entero mayor que 0.')).toBeInTheDocument();
    expect(screen.getByText('Los cupos deben ser un número entero mayor que 0.')).toBeInTheDocument();
    expect(screen.getByText('La fecha de fin no puede ser anterior a la de inicio.')).toBeInTheDocument();
    expect(couponApi.createCoupon).not.toHaveBeenCalled();
  });

  it('al editar un cupón usado el código no se puede cambiar', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.updateCoupon).mockResolvedValue(couponOf());
    const { onSaved } = renderDialog(couponOf({ id: 7, hasOrders: true }));

    const code = screen.getByLabelText('Código');
    expect(code).toHaveValue('CEVICHE10');
    expect(code).toHaveAttribute('readonly');
    expect(screen.getByText('El código no se puede cambiar porque ya se usó.')).toBeInTheDocument();
    expect(screen.getByLabelText('Cupos')).toHaveValue('50');

    await user.clear(screen.getByLabelText('Cupos'));
    await user.type(screen.getByLabelText('Cupos'), '80');
    await user.click(save());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Cupón actualizado'));
    expect(couponApi.updateCoupon).toHaveBeenCalledWith(7, expect.objectContaining({ code: 'CEVICHE10', maxUses: 80 }));
  });

  it('un cupón sin usos sí deja cambiar el código', () => {
    renderDialog(couponOf({ hasOrders: false, uses: 0 }));

    expect(screen.getByLabelText('Código')).not.toHaveAttribute('readonly');
  });

  it('muestra bajo su campo el error que devuelve el servidor', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.updateCoupon).mockRejectedValue(
      serverError(400, {
        fieldErrors: [{ field: 'maxUses', message: 'Ya se usó 12 veces: los cupos no pueden ser menos.' }],
      }),
    );
    const { onSaved } = renderDialog(couponOf());

    await user.clear(screen.getByLabelText('Cupos'));
    await user.type(screen.getByLabelText('Cupos'), '5');
    await user.click(save());

    expect(await screen.findByText('Ya se usó 12 veces: los cupos no pueden ser menos.')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('si falla sin detalle, muestra un error general', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.createCoupon).mockRejectedValue(serverError(500, {}));
    renderDialog();

    await user.type(screen.getByLabelText('Código'), 'NUEVO');
    await user.type(screen.getByLabelText('Valor (%)'), '10');
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar el cupón, intenta de nuevo.');
  });
});
