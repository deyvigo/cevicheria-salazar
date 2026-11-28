import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as couponApi from '@/features/admin/admin-coupon-api';
import { AdminCouponsPage } from '@/features/admin/admin-coupons-page';
import { couponOf } from '@tests/features/admin/coupon-fixtures';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-coupon-api');

function renderPage() {
  render(
    <QueryWrapper>
      <AdminCouponsPage />
    </QueryWrapper>,
  );
}

describe('AdminCouponsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('muestra un estado de carga', () => {
    vi.mocked(couponApi.listAdminCoupons).mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByText('Cargando los cupones...')).toBeInTheDocument();
  });

  it('si falla la carga, permite reintentar', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.listAdminCoupons).mockRejectedValueOnce(new Error('fail')).mockResolvedValue([couponOf()]);
    renderPage();

    expect(await screen.findByText('No pudimos cargar los cupones.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('rowheader', { name: /CEVICHE10/ })).toBeInTheDocument();
  });

  it('sin cupones invita a agregar el primero', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.listAdminCoupons).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Aún no tienes cupones')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar cupón' }));

    expect(screen.getByRole('heading', { name: 'Agregar cupón' })).toBeInTheDocument();
  });

  it('el interruptor cambia el estado y avisa si no se pudo', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.listAdminCoupons).mockResolvedValue([couponOf({ id: 3 })]);
    vi.mocked(couponApi.setCouponActive).mockRejectedValue(new Error('fail'));
    renderPage();

    await user.click(await screen.findByRole('switch', { name: 'Activo: CEVICHE10' }));

    expect(couponApi.setCouponActive).toHaveBeenCalledWith(3, false);
    expect(await screen.findByText('No pudimos actualizar el cupón, intenta de nuevo')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Activo: CEVICHE10' })).toBeChecked());
  });

  it('edita y elimina desde la tabla', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.listAdminCoupons).mockResolvedValue([couponOf({ id: 5, hasOrders: false, uses: 0 })]);
    vi.mocked(couponApi.deleteCoupon).mockResolvedValue();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Editar CEVICHE10' }));
    expect(screen.getByRole('heading', { name: 'Editar cupón' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await user.click(screen.getByRole('button', { name: 'Eliminar CEVICHE10' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Cupón eliminado')).toBeInTheDocument();
    expect(couponApi.deleteCoupon).toHaveBeenCalledWith(5);
  });
});
