import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoverageNotice } from '@/features/checkout/components/coverage-notice';

describe('CoverageNotice', () => {
  it('avisa que la dirección no está en cobertura y qué hacer', () => {
    render(<CoverageNotice />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Tu dirección no está en cobertura');
    expect(alert).toHaveTextContent('Elige otra dirección o cambia a recojo en tienda.');
  });
});
