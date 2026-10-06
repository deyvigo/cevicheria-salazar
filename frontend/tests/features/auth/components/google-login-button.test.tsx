import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoogleLoginButton } from '@/features/auth/components/google-login-button';

describe('GoogleLoginButton', () => {
  it('enlaza a /oauth2/authorization/google, fuera del prefijo /api', () => {
    render(<GoogleLoginButton />);

    const link = screen.getByRole('link', { name: /continuar con google/i });

    expect(link).toHaveAttribute('href', 'http://localhost:8080/oauth2/authorization/google');
  });
});
