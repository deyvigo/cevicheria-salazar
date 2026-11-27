import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { CouponForm } from '@/features/checkout/components/coupon-form';

vi.mock('@/features/checkout/checkout-api');

const items = [{ productId: 1, quantity: 2 }];

function renderForm(props: Partial<Parameters<typeof CouponForm>[0]> = {}) {
  const onApplied = vi.fn();
  const onRemove = vi.fn();
  render(
    <QueryWrapper>
      <CouponForm items={items} appliedCode={null} onApplied={onApplied} onRemove={onRemove} {...props} />
    </QueryWrapper>,
  );
  return { onApplied, onRemove };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('CouponForm', () => {
  it('pide un código antes de consultar', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(await screen.findByText('Ingresa un código.')).toBeInTheDocument();
    expect(checkoutApi.quoteCoupon).not.toHaveBeenCalled();
  });

  it('mientras consulta deshabilita el botón para no enviar dos veces', async () => {
    let resolve!: (value: checkoutApi.CouponQuote) => void;
    vi.mocked(checkoutApi.quoteCoupon).mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    const { onApplied } = renderForm();

    await user.type(screen.getByLabelText('Código de descuento'), 'CEVICHE10');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByRole('button', { name: 'Aplicando...' })).toBeDisabled();
    resolve({ code: 'CEVICHE10', discount: 6, subtotal: 60 });
    await vi.waitFor(() => expect(onApplied).toHaveBeenCalledWith({ code: 'CEVICHE10', discount: 6, subtotal: 60 }));
    expect(checkoutApi.quoteCoupon).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje del servidor y uno general si no hay motivo', async () => {
    vi.mocked(checkoutApi.quoteCoupon)
      .mockRejectedValueOnce(
        new AxiosError('too many', '429', undefined, undefined, {
          status: 429,
          data: { message: 'Demasiados intentos con códigos de descuento. Espera unos minutos.' },
        } as AxiosResponse),
      )
      .mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Código de descuento'), 'X');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(
      await screen.findByText('Demasiados intentos con códigos de descuento. Espera unos minutos.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(await screen.findByText('No pudimos validar el código. Intenta de nuevo.')).toBeInTheDocument();
  });

  it('con un cupón aplicado muestra el código y permite quitarlo', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderForm({ appliedCode: 'CEVICHE10' });

    expect(screen.getByText('CEVICHE10')).toBeInTheDocument();
    expect(screen.queryByLabelText('Código de descuento')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar' }));

    expect(onRemove).toHaveBeenCalled();
  });
});
