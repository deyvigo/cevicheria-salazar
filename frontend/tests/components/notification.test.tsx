import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Notification } from '@/components/notification';

describe('Notification', () => {
  it('muestra el título sin acción por defecto', () => {
    render(<Notification variant="success" title="Listo" />);

    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('pinta la acción cuando se pasa', () => {
    render(<Notification variant="success" title="Listo" action={<a href="/cart">Ver carrito</a>} />);

    expect(screen.getByRole('link', { name: 'Ver carrito' })).toBeInTheDocument();
  });

  describe('cierre automático', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('con onClose se cierra sola a los 2 segundos, no antes', () => {
      const onClose = vi.fn();
      render(<Notification variant="success" title="Listo" onClose={onClose} />);

      act(() => vi.advanceTimersByTime(1999));
      expect(onClose).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('volver a pintar con otro onClose no reinicia el tiempo', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(<Notification variant="success" title="Listo" onClose={first} />);

      act(() => vi.advanceTimersByTime(1500));
      rerender(<Notification variant="success" title="Listo" onClose={second} />);
      act(() => vi.advanceTimersByTime(500));

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('sin onClose no se cierra: la información debe quedarse', () => {
      render(<Notification variant="success" title="Revisa tu correo" />);

      act(() => vi.advanceTimersByTime(10_000));

      expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    });
  });
});
