import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuantityStepper } from '@/features/carrito/components/quantity-stepper';

function setup(props: Partial<React.ComponentProps<typeof QuantityStepper>> = {}) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<QuantityStepper value={3} min={0} max={5} label="Ceviche" onChange={onChange} {...props} />);
  const field = screen.getByRole('textbox', { name: 'Cantidad de Ceviche' });
  return { onChange, user, field };
}

describe('QuantityStepper', () => {
  it('+ y − cambian de a una unidad', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche' }));
    await user.click(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche' }));

    expect(onChange).toHaveBeenNthCalledWith(1, 4);
    expect(onChange).toHaveBeenNthCalledWith(2, 2);
  });

  it('deshabilita + en el máximo y − en el mínimo', () => {
    const { unmount } = render(<QuantityStepper value={5} min={0} max={5} label="Ceviche" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Agregar una unidad de Ceviche' })).toBeDisabled();
    unmount();

    render(<QuantityStepper value={1} min={1} max={5} label="Ceviche" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Quitar una unidad de Ceviche' })).toBeDisabled();
  });

  it('aplica lo escrito al confirmar con Enter, una sola vez', async () => {
    const { onChange, user, field } = setup();

    await user.clear(field);
    await user.type(field, '5');
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('aplica al salir del campo', async () => {
    const { onChange, user, field } = setup();

    await user.clear(field);
    await user.type(field, '2');
    await user.tab();

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('recorta un número mayor que el máximo y uno enorme', async () => {
    const { onChange, user, field } = setup({ max: 4 });

    await user.clear(field);
    await user.type(field, '50{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('interpreta ceros a la izquierda', async () => {
    const { onChange, user, field } = setup();

    await user.clear(field);
    await user.type(field, '004{Enter}');

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('no acepta letras, signos ni punto', async () => {
    const { user, field } = setup();

    await user.clear(field);
    await user.type(field, 'a-.e1');

    expect(field).toHaveValue('1');
  });

  it('vacío al confirmar vuelve al valor anterior sin llamar onChange', async () => {
    const { onChange, user, field } = setup();

    await user.clear(field);
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue('3');
  });

  it('con mínimo 0, escribir 0 llega como 0', async () => {
    const { onChange, user, field } = setup();

    await user.clear(field);
    await user.type(field, '0{Enter}');

    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('con mínimo 1, escribir 0 queda en 1 y no cambia nada si ya era 1', async () => {
    const { onChange, user, field } = setup({ value: 1, min: 1 });

    await user.clear(field);
    await user.type(field, '0{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue('1');
  });

  it('Enter no envía el formulario que lo contiene', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <QuantityStepper value={3} min={0} max={5} label="Ceviche" onChange={() => {}} />
      </form>,
    );

    await user.type(screen.getByRole('textbox'), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('deshabilitado bloquea los tres controles', () => {
    setup({ disabled: true });

    expect(screen.getByRole('textbox')).toBeDisabled();
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });

  it('refleja un valor nuevo que llega desde fuera', () => {
    const { rerender } = render(<QuantityStepper value={3} min={0} max={5} label="Ceviche" onChange={() => {}} />);

    rerender(<QuantityStepper value={4} min={0} max={5} label="Ceviche" onChange={() => {}} />);

    expect(screen.getByRole('textbox')).toHaveValue('4');
  });
});
