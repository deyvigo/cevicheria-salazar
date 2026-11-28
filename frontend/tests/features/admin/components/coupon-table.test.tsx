import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AdminCoupon } from '@/features/admin/admin-coupon-api';
import { CouponTable } from '@/features/admin/components/coupon-table';
import { couponOf } from '@tests/features/admin/coupon-fixtures';

function renderTable(coupons: AdminCoupon[], handlers: Partial<Parameters<typeof CouponTable>[0]> = {}) {
  const props = {
    isActive: (coupon: AdminCoupon) => coupon.active,
    isSaving: () => false,
    onToggle: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...handlers,
  };
  render(<CouponTable coupons={coupons} {...props} />);
  return props;
}

function row(code: string) {
  return screen.getByRole('rowheader', { name: new RegExp(code) }).closest('tr') as HTMLElement;
}

describe('CouponTable', () => {
  it('muestra el descuento, los usos por persona, los cupos y la vigencia de cada cupón', () => {
    renderTable([
      couponOf(),
      couponOf({
        id: 2,
        code: 'BIENVENIDA5',
        discountType: 'FIXED',
        discountValue: 5,
        maxUses: null,
        maxUsesPerCustomer: null,
        uses: 0,
        startsOn: '2026-12-01',
        endsOn: '2026-12-31',
      }),
    ]);

    const percentage = within(row('CEVICHE10'));
    expect(percentage.getByText('10 %')).toBeInTheDocument();
    expect(percentage.getByText('1')).toBeInTheDocument();
    expect(percentage.getByText('12 / 50')).toBeInTheDocument();
    expect(percentage.getByText('Siempre')).toBeInTheDocument();

    const fixed = within(row('BIENVENIDA5'));
    expect(fixed.getByText('S/ 5.00')).toBeInTheDocument();
    expect(fixed.getByText('Sin límite')).toBeInTheDocument();
    expect(fixed.getByText('0 / Sin límite')).toBeInTheDocument();
    expect(fixed.getByText(/^1 dic\.? 2026 – 31 dic\.? 2026$/)).toBeInTheDocument();
  });

  it('con una sola fecha dice desde o hasta cuándo vale', () => {
    renderTable([
      couponOf({ id: 1, code: 'DESDE', startsOn: '2026-12-01' }),
      couponOf({ id: 2, code: 'HASTA', endsOn: '2026-12-31' }),
    ]);

    expect(within(row('DESDE')).getByText(/^Desde 1 dic\.? 2026$/)).toBeInTheDocument();
    expect(within(row('HASTA')).getByText(/^Hasta 31 dic\.? 2026$/)).toBeInTheDocument();
  });

  it('marca los cupones agotados y vencidos', () => {
    renderTable([
      couponOf({ id: 1, code: 'LLENO', exhausted: true }),
      couponOf({ id: 2, code: 'VIEJO', expired: true }),
      couponOf({ id: 3, code: 'NORMAL' }),
    ]);

    expect(within(row('LLENO')).getByText('Agotado')).toBeInTheDocument();
    expect(within(row('VIEJO')).getByText('Vencido')).toBeInTheDocument();
    expect(within(row('NORMAL')).queryByText(/Agotado|Vencido/)).not.toBeInTheDocument();
  });

  it('el interruptor refleja el estado y avisa el cambio', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderTable([couponOf({ active: true })]);

    const toggle = screen.getByRole('switch', { name: 'Activo: CEVICHE10' });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ code: 'CEVICHE10' }), false);
  });

  it('solo se puede eliminar un cupón sin pedidos, y el usado explica por qué', async () => {
    const user = userEvent.setup();
    const { onDelete, onEdit } = renderTable([
      couponOf({ id: 1, code: 'USADO', hasOrders: true }),
      couponOf({ id: 2, code: 'NUEVO', hasOrders: false, uses: 0 }),
    ]);

    const used = screen.getByRole('button', { name: 'Eliminar USADO' });
    expect(used).toBeDisabled();
    expect(used).toHaveAccessibleDescription('Tiene pedidos asociados: desactívalo en su lugar.');

    await user.click(screen.getByRole('button', { name: 'Eliminar NUEVO' }));
    await user.click(screen.getByRole('button', { name: 'Editar USADO' }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ code: 'NUEVO' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ code: 'USADO' }));
  });
});
