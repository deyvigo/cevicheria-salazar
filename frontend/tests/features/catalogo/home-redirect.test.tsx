import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as catalogApi from '@/features/catalogo/catalog-api';
import { HomeRedirect } from '@/features/catalogo/home-redirect';

vi.mock('@/features/catalogo/catalog-api');

function Destination() {
  const location = useLocation();
  return <p>{`destino ${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

describe('HomeRedirect', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.getCategories).mockResolvedValue([
      { id: 1, name: 'Entradas', slug: 'entradas' },
      { id: 2, name: 'Ceviches', slug: 'ceviches' },
    ]);
  });

  it('lleva a la primera categoría conservando el estado de navegación', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/', state: { loggedOut: true } }]}>
        <QueryWrapper>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/:category" element={<Destination />} />
          </Routes>
        </QueryWrapper>
      </MemoryRouter>,
    );

    expect(await screen.findByText('destino /entradas {"loggedOut":true}')).toBeInTheDocument();
  });
});
