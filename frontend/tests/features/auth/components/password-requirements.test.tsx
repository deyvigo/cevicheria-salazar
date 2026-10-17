import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordRequirements } from '@/features/auth/components/password-requirements';

describe('PasswordRequirements', () => {
  it('lista las tres condiciones de la contraseña', () => {
    render(<PasswordRequirements />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Tener al menos 8 caracteres y como máximo 72.')).toBeInTheDocument();
    expect(screen.getByText('Incluir al menos una letra.')).toBeInTheDocument();
    expect(screen.getByText('Incluir al menos un número.')).toBeInTheDocument();
  });

  it('agrega la condición de ser distinta de la actual cuando se pide', () => {
    render(<PasswordRequirements differentFromCurrent />);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('Ser distinta de tu contraseña actual.')).toBeInTheDocument();
  });
});
