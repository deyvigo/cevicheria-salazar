import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '@/components/switch';

describe('Switch', () => {
  it('expone su estado y lo invierte al hacer clic', async () => {
    const onChange = vi.fn();
    render(<Switch label="Activo" checked={false} onChange={onChange} />);

    const control = screen.getByRole('switch', { name: 'Activo' });
    expect(control).toHaveAttribute('aria-checked', 'false');

    await userEvent.setup().click(control);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('se activa con el teclado y no responde si está deshabilitado', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Switch label="Activo" checked onChange={onChange} />);

    screen.getByRole('switch').focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(false);

    onChange.mockClear();
    rerender(<Switch label="Activo" checked onChange={onChange} disabled />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
