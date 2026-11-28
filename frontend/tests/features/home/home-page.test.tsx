import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as catalogApi from '@/features/catalogo/catalog-api';
import { HomePage } from '@/features/home/home-page';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/catalogo/catalog-api');

function renderHome() {
  const { container } = render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<p>Carta</p>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  );
  return container;
}

function activePhoto(container: HTMLElement) {
  return container.querySelector('img[data-active="true"]');
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(catalogApi.getFeaturedProducts).mockResolvedValue([]);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el hero con su título, texto y el acceso a la carta', async () => {
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: 'El sabor del mar en cada plato' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'El sabor del mar en cada plato' })).toBeInTheDocument();
    expect(
      screen.getByText('Ceviches y chicharrones preparados al momento. Haz tu pedido en minutos.'),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Ver la carta' });
    expect(link).toHaveAttribute('href', '/menu');

    await user.click(link);

    expect(screen.getByText('Carta')).toBeInTheDocument();
  });

  it('las fotos son decorativas, con dos anchos, y la primera se carga con prioridad', () => {
    const container = renderHome();

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const photos = container.querySelectorAll('img');
    expect(photos).toHaveLength(3);
    photos.forEach((photo, index) => {
      expect(photo).toHaveAttribute('alt', '');
      expect(photo).toHaveAttribute(
        'srcset',
        `/hero/hero-${index + 1}-1200.webp 1200w, /hero/hero-${index + 1}-2000.webp 2000w`,
      );
    });
    expect(photos[0]).toHaveAttribute('fetchpriority', 'high');
    expect(photos[1]).toHaveAttribute('loading', 'lazy');
    expect(activePhoto(container)).toBe(photos[0]);
  });

  it('los puntos cambian la foto visible y marcan la actual', async () => {
    const user = userEvent.setup();
    const container = renderHome();

    expect(screen.getByRole('button', { name: 'Ver foto 1 de 3' })).toHaveAttribute('aria-current', 'true');
    await user.click(screen.getByRole('button', { name: 'Ver foto 3 de 3' }));

    expect(screen.getByRole('button', { name: 'Ver foto 3 de 3' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Ver foto 1 de 3' })).not.toHaveAttribute('aria-current');
    expect(activePhoto(container)).toHaveAttribute('src', '/hero/hero-3-2000.webp');
  });

  it('el botón de pausa alterna entre pausar y reanudar', async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole('button', { name: 'Pausar fotos' }));
    await user.click(screen.getByRole('button', { name: 'Reanudar fotos' }));

    expect(screen.getByRole('button', { name: 'Pausar fotos' })).toBeInTheDocument();
  });

  it('con movimiento reducido no muestra el botón de pausa', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    renderHome();

    expect(screen.queryByRole('button', { name: /fotos$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver foto 2 de 3' })).toBeInTheDocument();
  });
});
