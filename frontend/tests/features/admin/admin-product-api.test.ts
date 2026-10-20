import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct, updateProduct } from '@/features/admin/admin-product-api';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

const payload = {
  name: 'Ceviche',
  description: 'Fresco',
  price: 32,
  categoryId: 2,
  stock: 5,
  active: true,
  available: true,
};

async function sentData(form: FormData) {
  return JSON.parse(await (form.get('data') as Blob).text());
}

describe('admin-product-api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('envía los datos como JSON y solo los archivos nuevos, en el orden de la lista', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: {} });
    const first = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'b.png', { type: 'image/png' });

    await updateProduct(7, payload, [
      { key: 'new-1', url: 'blob:1', file: first },
      { key: 'saved-4', url: 'u4', id: 4 },
      { key: 'new-2', url: 'blob:2', file: second },
    ]);

    const [url, form] = vi.mocked(api.put).mock.calls[0] as [string, FormData];
    expect(url).toBe('/admin/products/7');
    expect(await sentData(form)).toEqual({ ...payload, images: [{ file: 0 }, { id: 4 }, { file: 1 }] });
    expect(form.getAll('files')).toEqual([first, second]);
  });

  it('al crear no envía archivos si no hay imágenes nuevas', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    await createProduct(payload, []);

    const [url, form] = vi.mocked(api.post).mock.calls[0] as [string, FormData];
    expect(url).toBe('/admin/products');
    expect(form.getAll('files')).toEqual([]);
  });
});
