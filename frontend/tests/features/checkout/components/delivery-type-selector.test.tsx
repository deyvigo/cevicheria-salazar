import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeliveryTypeSelector } from '@/features/checkout/components/delivery-type-selector';

describe('DeliveryTypeSelector', () => {
  it('muestra Entrega y Recojo en tienda con la opción actual marcada', () => {
    render(<DeliveryTypeSelector value="delivery" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup', { name: 'Tipo de entrega' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Entrega' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Recojo en tienda' })).not.toBeChecked();
  });

  it('avisa el tipo elegido', async () => {
    const onChange = vi.fn();
    render(<DeliveryTypeSelector value="delivery" onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Recojo en tienda' }));

    expect(onChange).toHaveBeenCalledWith('pickup');
  });
});
