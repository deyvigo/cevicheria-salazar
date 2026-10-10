import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SearchBox } from '@/components/search-box';

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderBox(initialValue?: string) {
  return render(
    <MemoryRouter initialEntries={['/ceviches?page=2&sort=price_desc']}>
      <SearchBox initialValue={initialValue} />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchBox', () => {
  it('escribir no navega ni cambia la URL', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar platos' }), 'ceviche');

    expect(screen.getByTestId('location')).toHaveTextContent('/ceviches?page=2&sort=price_desc');
  });

  it('Enter busca y descarta categoría, página y orden', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar platos' }), 'ceviche{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/\?q=ceviche$/);
  });

  it('el clic en la lupa busca', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar platos' }), 'ceviche mixto');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/\?q=ceviche\+mixto$/);
  });

  it('recorta los espacios del término', async () => {
    const user = userEvent.setup();
    renderBox();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar platos' }), '  ceviche  {Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/\?q=ceviche$/);
  });

  it('enviar vacío quita el filtro y va a /', async () => {
    const user = userEvent.setup();
    renderBox('ceviche');

    const input = screen.getByRole('searchbox', { name: 'Buscar platos' });
    expect(input).toHaveValue('ceviche');
    await user.clear(input);
    await user.type(input, '   {Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('limita el término a 100 caracteres', () => {
    renderBox();

    expect(screen.getByRole('searchbox', { name: 'Buscar platos' })).toHaveAttribute('maxlength', '100');
  });
});
