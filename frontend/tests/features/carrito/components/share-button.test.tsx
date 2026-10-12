import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareButton } from '@/features/carrito/components/share-button';
import { decodeCart } from '@/features/carrito/share-code';

const ITEMS = [
  { productId: 12, quantity: 2 },
  { productId: 7, quantity: 1 },
];

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('ShareButton', () => {
  it('copia un enlace /cart?c= que decodifica al carrito y confirma', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    stubClipboard(writeText);
    render(<ShareButton items={ITEMS} />);

    await user.click(screen.getByRole('button', { name: 'Compartir' }));

    const url = new URL(writeText.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/cart');
    expect(decodeCart(url.searchParams.get('c') as string)).toEqual({
      ok: true,
      items: [
        { productId: 7, quantity: 1 },
        { productId: 12, quantity: 2 },
      ],
    });
    expect(await screen.findByText('Copiamos el enlace de tu carrito')).toBeInTheDocument();
  });

  it('si el portapapeles falla muestra el enlace en un campo de solo lectura', async () => {
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(<ShareButton items={ITEMS} />);

    await user.click(screen.getByRole('button', { name: 'Compartir' }));

    const field = await screen.findByLabelText('Copia el enlace de tu carrito');
    expect(field).toHaveAttribute('readonly');
    expect((field as HTMLInputElement).value).toContain('/cart?c=');
    expect(screen.queryByText('Copiamos el enlace de tu carrito')).not.toBeInTheDocument();
  });

  it('sin navigator.clipboard también ofrece el campo', async () => {
    const user = userEvent.setup();
    // user-event installs its own clipboard stub in setup()
    Reflect.deleteProperty(navigator, 'clipboard');
    render(<ShareButton items={ITEMS} />);

    await user.click(screen.getByRole('button', { name: 'Compartir' }));

    expect(await screen.findByLabelText('Copia el enlace de tu carrito')).toBeInTheDocument();
  });
});
