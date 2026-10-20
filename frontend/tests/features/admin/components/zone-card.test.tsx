import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ZoneCard } from '@/features/admin/components/zone-card';

const zone = { id: 3, name: 'Miraflores', price: 8, color: 'lima' as const, active: true, coordinates: [] };

function renderCard(overrides: Partial<Parameters<typeof ZoneCard>[0]> = {}) {
  const handlers = { onHover: vi.fn(), onSelect: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<ZoneCard zone={zone} hovered={false} selected={false} {...handlers} {...overrides} />);
  return handlers;
}

describe('ZoneCard', () => {
  it('muestra el nombre, la tarifa y las acciones', () => {
    renderCard();

    expect(screen.getByText('Miraflores')).toBeInTheDocument();
    expect(screen.getByText('S/ 8.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Miraflores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar Miraflores' })).toBeInTheDocument();
    expect(screen.queryByText('Inactiva')).not.toBeInTheDocument();
  });

  it('una zona inactiva muestra la etiqueta', () => {
    renderCard({ zone: { ...zone, active: false } });

    expect(screen.getByText('Inactiva')).toBeInTheDocument();
  });

  it('el cursor avisa al entrar y al salir', async () => {
    const { onHover } = renderCard();
    const user = userEvent.setup();

    await user.hover(screen.getByText('Miraflores'));
    await user.unhover(screen.getByText('Miraflores'));

    expect(onHover).toHaveBeenNthCalledWith(1, 3);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('el foco resalta igual que el cursor', async () => {
    const { onHover } = renderCard();
    const user = userEvent.setup();

    await user.tab();
    expect(onHover).toHaveBeenCalledWith(3);
    await user.tab();
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('clic, Enter y Espacio seleccionan', async () => {
    const { onSelect } = renderCard();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Miraflores/ , pressed: false }));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('refleja la selección con aria-pressed', () => {
    renderCard({ selected: true });

    expect(screen.getByRole('button', { name: /Miraflores/, pressed: true })).toBeInTheDocument();
  });

  it('editar y eliminar no seleccionan la tarjeta', async () => {
    const { onSelect, onEdit, onDelete } = renderCard();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Editar Miraflores' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar Miraflores' }));

    expect(onEdit).toHaveBeenCalledWith(zone);
    expect(onDelete).toHaveBeenCalledWith(zone);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
