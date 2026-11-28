import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CashOnDeliveryForm } from '@/features/checkout/components/cash-on-delivery-form';
import type { CollectionMethod } from '@/features/checkout/checkout-store';

function setup(props: { method?: CollectionMethod | null; cashAmount?: string; deliveryType?: 'delivery' | 'pickup' } = {}) {
  const onMethodChange = vi.fn();
  const onCashAmountChange = vi.fn();
  render(
    <CashOnDeliveryForm
      deliveryType={props.deliveryType ?? 'delivery'}
      method={props.method ?? null}
      cashAmount={props.cashAmount ?? ''}
      total={85}
      onMethodChange={onMethodChange}
      onCashAmountChange={onCashAmountChange}
    />,
  );
  return { onMethodChange, onCashAmountChange };
}

describe('CashOnDeliveryForm', () => {
  it('muestra Efectivo y Yape sin ninguno elegido y sin campo de monto', () => {
    setup();

    expect(screen.getByRole('radio', { name: 'Efectivo' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Billetera virtual' })).not.toBeChecked();
    expect(screen.queryByLabelText(/¿Con cuánto pagarás\?/)).not.toBeInTheDocument();
  });

  it('la billetera virtual muestra Yape y Plin', () => {
    setup();

    const wallet = screen.getByRole('radio', { name: 'Billetera virtual' });
    expect(within(wallet).getByAltText('Yape')).toHaveAttribute('src', '/payments/yape.png');
    expect(within(wallet).getByAltText('Plin')).toHaveAttribute('src', '/payments/plin.png');
    expect(within(screen.getByRole('radio', { name: 'Efectivo' })).queryByAltText('Yape')).not.toBeInTheDocument();
  });

  it('con Efectivo aparece el campo opcional y con Yape no', () => {
    setup({ method: 'cash' });
    expect(screen.getByLabelText(/¿Con cuánto pagarás\? \(opcional\)/)).toBeInTheDocument();
  });

  it('muestra el error por monto insuficiente y el vuelto por monto suficiente', () => {
    const { unmount } = render(
      <CashOnDeliveryForm
        deliveryType="delivery"
        method="cash"
        cashAmount="50"
        total={85}
        onMethodChange={() => {}}
        onCashAmountChange={() => {}}
      />,
    );
    expect(screen.getByText('El monto debe ser al menos S/ 85.00')).toBeInTheDocument();
    unmount();

    setup({ method: 'cash', cashAmount: '100' });
    expect(screen.getByText('Vuelto: S/ 15.00')).toBeInTheDocument();
  });

  it('las opciones se eligen con clic y con teclado', async () => {
    const user = userEvent.setup();
    const { onMethodChange } = setup();

    await user.click(screen.getByRole('radio', { name: 'Billetera virtual' }));
    screen.getByRole('radio', { name: 'Efectivo' }).focus();
    await user.keyboard('{Enter}');

    expect(onMethodChange).toHaveBeenNthCalledWith(1, 'yape');
    expect(onMethodChange).toHaveBeenNthCalledWith(2, 'cash');
  });

  it('con Recojo los textos hablan de recoger', () => {
    setup({ deliveryType: 'pickup' });

    expect(screen.getByText('Detalle del pago al recoger')).toBeInTheDocument();
    expect(screen.getByText('Pagas con Yape o Plin al recoger')).toBeInTheDocument();
  });
});
