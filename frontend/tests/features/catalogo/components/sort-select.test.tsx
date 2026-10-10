import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SortSelect } from '@/features/catalogo/components/sort-select';

describe('SortSelect', () => {
  it('ofrece las seis opciones de orden', () => {
    render(<SortSelect value="name_asc" onChange={vi.fn()} />);

    const labels = screen.getAllByRole('option').map((option) => option.textContent);
    expect(labels).toEqual([
      'Nombre: ascendente',
      'Nombre: descendente',
      'Precio: ascendente',
      'Precio: descendente',
      'Popularidad: ascendente',
      'Popularidad: descendente',
    ]);
  });

  it('muestra el valor actual y avisa el cambio', async () => {
    const onChange = vi.fn();
    render(<SortSelect value="price_asc" onChange={onChange} />);
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('price_asc');

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'rating_desc');

    expect(onChange).toHaveBeenCalledWith('rating_desc');
  });
});
