import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckoutStepper } from '@/features/checkout/components/checkout-stepper';

function steps() {
  return within(screen.getByRole('navigation', { name: 'Pasos de la compra' })).getAllByRole('listitem');
}

describe('CheckoutStepper', () => {
  it('sin sesión muestra los cinco pasos en orden, numerados del 1 al 5', () => {
    render(<CheckoutStepper currentStep="cart" isAuthenticated={false} />);

    const items = steps();
    expect(items).toHaveLength(5);
    const expected = [
      ['1', 'Carrito de compras', 'Revisa tus productos'],
      ['2', 'Inicio de sesión', 'Ingresa a tu cuenta'],
      ['3', 'Entrega', 'Elige dónde recibir tu pedido'],
      ['4', 'Pago', 'Elige cómo vas a pagar'],
      ['5', '¡Listo!', 'Revisa el detalle de tu pedido'],
    ];
    expected.forEach((texts, i) => {
      texts.forEach((text) => expect(within(items[i]).getByText(text)).toBeInTheDocument());
    });
  });

  it('con sesión omite "Inicio de sesión" y numera del 1 al 4', () => {
    render(<CheckoutStepper currentStep="cart" isAuthenticated />);

    const items = steps();
    expect(items).toHaveLength(4);
    expect(screen.queryByText('Inicio de sesión')).not.toBeInTheDocument();
    expect(within(items[1]).getByText('2')).toBeInTheDocument();
    expect(within(items[1]).getByText('Entrega')).toBeInTheDocument();
    expect(within(items[3]).getByText('4')).toBeInTheDocument();
  });

  it('marca solo el paso actual con aria-current', () => {
    const { rerender } = render(<CheckoutStepper currentStep="cart" isAuthenticated={false} />);
    expect(steps().filter((li) => li.getAttribute('aria-current') === 'step')).toHaveLength(1);
    expect(within(steps()[0]).getByText('Carrito de compras')).toBeInTheDocument();
    expect(steps()[0]).toHaveAttribute('aria-current', 'step');

    rerender(<CheckoutStepper currentStep="delivery" isAuthenticated={false} />);
    const current = steps().filter((li) => li.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(within(current[0]).getByText('Entrega')).toBeInTheDocument();
  });

  it('es una lista ordenada sin enlaces ni botones', () => {
    render(<CheckoutStepper currentStep="cart" isAuthenticated={false} />);

    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
