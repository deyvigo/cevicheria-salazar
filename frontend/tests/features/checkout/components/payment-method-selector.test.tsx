import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector } from '@/features/checkout/components/payment-method-selector';

describe('PaymentMethodSelector', () => {
  it('muestra las dos opciones sin ninguna marcada', () => {
    render(<PaymentMethodSelector value={null} deliveryType="delivery" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: 'Método de pago' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pago en línea' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Contraentrega' })).not.toBeChecked();
  });

  it('marca solo la opción elegida', () => {
    render(<PaymentMethodSelector value="cash_on_delivery" deliveryType="delivery" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Contraentrega' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pago en línea' })).not.toBeChecked();
  });

  it('avisa el método elegido con clic y con teclado', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<PaymentMethodSelector value={null} deliveryType="delivery" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Pago en línea' }));
    screen.getByRole('radio', { name: 'Contraentrega' }).focus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenNthCalledWith(1, 'online');
    expect(onChange).toHaveBeenNthCalledWith(2, 'cash_on_delivery');
  });

  it('el texto de contraentrega depende del tipo de entrega', () => {
    const { rerender } = render(<PaymentMethodSelector value={null} deliveryType="delivery" onChange={() => {}} />);
    expect(screen.getByText('Paga al recibir tu pedido')).toBeInTheDocument();

    rerender(<PaymentMethodSelector value={null} deliveryType="pickup" onChange={() => {}} />);
    expect(screen.getByText('Paga al recoger tu pedido en tienda')).toBeInTheDocument();
  });
});
