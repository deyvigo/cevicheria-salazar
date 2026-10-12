import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';
import { takeReturnPath } from '@/features/auth/return-path';

function renderButton(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/iniciar-sesion', state }]}>
      <GoogleLoginButton />
    </MemoryRouter>,
  );
}

describe('GoogleLoginButton', () => {
  beforeEach(() => sessionStorage.clear());

  it('enlaza a /oauth2/authorization/google, fuera del prefijo /api', () => {
    renderButton();

    const link = screen.getByRole('link', { name: /continuar con google/i });

    expect(link).toHaveAttribute('href', 'http://localhost:8080/oauth2/authorization/google');
  });

  it('al hacer clic recuerda la pantalla de origen para volver tras el viaje a Google', async () => {
    renderButton({ from: '/cart' });
    const link = screen.getByRole('link', { name: /continuar con google/i });
    // jsdom would try to navigate on a real anchor click
    link.addEventListener('click', (event) => event.preventDefault());

    await userEvent.setup().click(link);

    expect(takeReturnPath()).toBe('/cart');
  });

  it('sin pantalla de origen no deja nada guardado', async () => {
    renderButton();
    const link = screen.getByRole('link', { name: /continuar con google/i });
    link.addEventListener('click', (event) => event.preventDefault());

    await userEvent.setup().click(link);

    expect(takeReturnPath()).toBeNull();
  });
});
