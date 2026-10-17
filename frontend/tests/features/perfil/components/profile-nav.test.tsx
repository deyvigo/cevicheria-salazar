import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProfileNav } from '@/features/perfil/components/profile-nav';

function renderNav(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/perfil/*" element={<ProfileNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfileNav', () => {
  it('muestra "Mi información" con su ruta y la marca como actual', () => {
    renderNav('/perfil/mi-informacion');

    const link = screen.getByRole('link', { name: 'Mi información' });
    expect(link).toHaveAttribute('href', '/perfil/mi-informacion');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('no marca la sección en otra ruta', () => {
    renderNav('/perfil/otra');

    expect(screen.getByRole('link', { name: 'Mi información' })).not.toHaveAttribute('aria-current');
  });
});
