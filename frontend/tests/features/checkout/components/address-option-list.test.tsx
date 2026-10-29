import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddressOptionList } from '@/features/checkout/components/address-option-list';

const casa = { id: 1, label: 'Casa', address: 'Av. Arequipa 123', reference: 'Frente al parque', latitude: -12, longitude: -77 };
const trabajo = { ...casa, id: 2, label: 'Trabajo', address: 'Jr. Unión 1', reference: null };

function renderList(props: Partial<React.ComponentProps<typeof AddressOptionList>> = {}) {
  const handlers = { onSelect: vi.fn(), onAdd: vi.fn(), onRetry: vi.fn() };
  render(
    <AddressOptionList
      addresses={[casa, trabajo]}
      isPending={false}
      isError={false}
      selectedId={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('AddressOptionList', () => {
  it('muestra una opción por dirección y "Agregar nueva dirección" al final', () => {
    renderList();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveTextContent('Casa');
    expect(radios[0]).toHaveTextContent('Frente al parque');
    expect(screen.getByRole('button', { name: 'Agregar nueva dirección' })).toBeInTheDocument();
  });

  it('sin direcciones solo ofrece agregar una', () => {
    renderList({ addresses: [] });

    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Agregar nueva dirección' })).toBeInTheDocument();
  });

  it('marca solo la dirección elegida y avisa al elegir con clic o teclado', async () => {
    const { onSelect } = renderList({ selectedId: 2 });
    const user = userEvent.setup();

    expect(screen.getByRole('radio', { name: /Trabajo/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Casa/ })).not.toBeChecked();

    await user.click(screen.getByRole('radio', { name: /Casa/ }));
    screen.getByRole('radio', { name: /Casa/ }).focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('"Agregar nueva dirección" avisa', async () => {
    const { onAdd } = renderList();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Agregar nueva dirección' }));

    expect(onAdd).toHaveBeenCalled();
  });

  it('muestra un estado de carga', () => {
    renderList({ addresses: undefined, isPending: true });

    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar nueva dirección' })).not.toBeInTheDocument();
  });

  it('si falla, avisa y "Reintentar" vuelve a pedir', async () => {
    const { onRetry } = renderList({ addresses: undefined, isError: true });

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tus direcciones.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onRetry).toHaveBeenCalled();
  });
});
