import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ZoneColorPicker } from '@/features/admin/components/zone-color-picker';
import { ZONE_COLORS } from '@/features/admin/zone-colors';

describe('ZoneColorPicker', () => {
  it('muestra una opción por color de la paleta con su nombre', () => {
    render(<ZoneColorPicker value="celeste" onChange={vi.fn()} />);

    expect(screen.getAllByRole('radio')).toHaveLength(ZONE_COLORS.length);
    expect(screen.getByRole('radio', { name: 'Celeste' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Coral' })).not.toBeChecked();
  });

  it('al elegir un color avisa su id', async () => {
    const onChange = vi.fn();
    render(<ZoneColorPicker value="celeste" onChange={onChange} />);

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Coral' }));

    expect(onChange).toHaveBeenCalledWith('coral');
  });

  it('se puede elegir con el teclado', async () => {
    const onChange = vi.fn();
    render(<ZoneColorPicker value="celeste" onChange={onChange} />);
    const user = userEvent.setup();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('celeste');
  });
});
