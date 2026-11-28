import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as couponApi from '@/features/admin/admin-coupon-api';
import { DeleteCouponDialog } from '@/features/admin/components/delete-coupon-dialog';
import { couponOf } from '@tests/features/admin/coupon-fixtures';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/admin/admin-coupon-api');

function renderDialog(onDeleted = vi.fn()) {
  const coupon = couponOf({ id: 4, hasOrders: false, uses: 0 });
  render(
    <QueryWrapper>
      <DeleteCouponDialog coupon={coupon} onClose={vi.fn()} onDeleted={onDeleted} />
    </QueryWrapper>,
  );
  return { onDeleted, coupon };
}

describe('DeleteCouponDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('pide confirmación y elimina el cupón', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.deleteCoupon).mockResolvedValue();
    const { onDeleted, coupon } = renderDialog();

    expect(screen.getByText(/Eliminar el cupón/)).toHaveTextContent(
      '¿Eliminar el cupón CEVICHE10? Esta acción no se puede deshacer.',
    );
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(coupon));
    expect(couponApi.deleteCoupon).toHaveBeenCalledWith(4);
  });

  it('si el cupón ya tiene pedidos, explica que hay que desactivarlo', async () => {
    const user = userEvent.setup();
    vi.mocked(couponApi.deleteCoupon).mockRejectedValue(
      new AxiosError('fail', 'ERR', undefined, undefined, { status: 409, data: {} } as never),
    );
    const { onDeleted } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tiene pedidos asociados: desactívalo en su lugar.');
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
