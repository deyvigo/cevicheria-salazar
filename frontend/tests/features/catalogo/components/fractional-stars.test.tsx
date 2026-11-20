import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FractionalStars } from '@/features/catalogo/components/fractional-stars';

function clips(rating: number) {
  const { container } = render(<FractionalStars rating={rating} className="h-5 w-5" />);
  return Array.from(container.querySelectorAll<SVGElement>('svg[style]')).map((svg) => svg.style.clipPath);
}

describe('FractionalStars', () => {
  it('muestra siempre cinco estrellas', () => {
    const { container } = render(<FractionalStars rating={0} className="h-5 w-5" />);
    expect(container.querySelectorAll('svg')).toHaveLength(5);
  });

  it('pinta completas las estrellas enteras y una parte de la siguiente', () => {
    const result = clips(4.3);

    expect(result).toHaveLength(5);
    expect(result.slice(0, 4)).toEqual(Array(4).fill('inset(0 0% 0 0)'));
    expect(result[4]).toBe('inset(0 70% 0 0)');
  });

  it('con 5 las pinta todas y con 0 no pinta ninguna', () => {
    expect(clips(5)).toEqual(Array(5).fill('inset(0 0% 0 0)'));
    expect(clips(0)).toHaveLength(0);
  });
});
