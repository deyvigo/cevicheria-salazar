import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProductImageItem } from '@/features/admin/admin-product-api';
import { ProductImagesField } from '@/features/admin/components/product-images-field';

const saved = (id: number): ProductImageItem => ({ key: `saved-${id}`, id, url: `https://media/${id}.jpg` });

function Harness({ initial, onChange }: { initial: ProductImageItem[]; onChange?: (images: ProductImageItem[]) => void }) {
  const [images, setImages] = useState(initial);
  return (
    <ProductImagesField
      value={images}
      onChange={(next) => {
        setImages(next);
        onChange?.(next);
      }}
    />
  );
}

function order() {
  return screen.getAllByRole('img').map((image) => image.getAttribute('src'));
}

describe('ProductImagesField', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
    URL.revokeObjectURL = vi.fn();
  });

  it('muestra las imágenes en orden y marca la primera como principal', () => {
    render(<Harness initial={[saved(1), saved(2)]} />);

    expect(order()).toEqual(['https://media/1.jpg', 'https://media/2.jpg']);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Principal')).toBeInTheDocument();
    expect(within(items[1]).queryByText('Principal')).not.toBeInTheDocument();
  });

  it('arrastrar una imagen cambia el orden y la que llega al primer lugar es la principal', () => {
    render(<Harness initial={[saved(1), saved(2), saved(3)]} />);
    const items = screen.getAllByRole('listitem');

    fireEvent.dragStart(items[2]);
    fireEvent.drop(items[0]);

    expect(order()).toEqual(['https://media/3.jpg', 'https://media/1.jpg', 'https://media/2.jpg']);
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Principal')).toBeInTheDocument();
  });

  it('soltar sobre sí misma no cambia nada', () => {
    const onChange = vi.fn();
    render(<Harness initial={[saved(1), saved(2)]} onChange={onChange} />);
    const items = screen.getAllByRole('listitem');

    fireEvent.dragStart(items[1]);
    fireEvent.drop(items[1]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('con teclado, Alt y las flechas mueven la imagen enfocada', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[saved(1), saved(2), saved(3)]} />);

    screen.getAllByRole('listitem')[2].focus();
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');

    expect(order()).toEqual(['https://media/1.jpg', 'https://media/3.jpg', 'https://media/2.jpg']);
  });

  it('quitar saca solo esa imagen', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[saved(1), saved(2), saved(3)]} />);

    await user.click(screen.getByRole('button', { name: 'Quitar imagen 2' }));

    expect(order()).toEqual(['https://media/1.jpg', 'https://media/3.jpg']);
  });

  it('agregar archivos válidos los añade al final con vista previa', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={[saved(1)]} onChange={onChange} />);

    const file = new File(['x'], 'nueva.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Archivos de imagen'), file);

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(onChange.mock.lastCall?.[0][1].file).toBe(file);
  });

  it('rechaza tipos no permitidos y archivos de más de 5 MB, y conserva el resto', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness initial={[]} />);

    const good = new File(['x'], 'ok.webp', { type: 'image/webp' });
    const gif = new File(['x'], 'animada.gif', { type: 'image/gif' });
    const big = new File([new ArrayBuffer(5 * 1024 * 1024 + 1)], 'grande.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Archivos de imagen'), [good, gif, big]);

    expect(screen.getByText('Solo JPG, PNG o WebP de hasta 5 MB.')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('con 5 imágenes deshabilita agregar e indica el máximo', async () => {
    render(<Harness initial={[1, 2, 3, 4, 5].map(saved)} />);

    expect(screen.getByRole('button', { name: 'Agregar imágenes' })).toBeDisabled();
    expect(screen.getByText('Máximo 5 imágenes')).toBeInTheDocument();
  });
});
