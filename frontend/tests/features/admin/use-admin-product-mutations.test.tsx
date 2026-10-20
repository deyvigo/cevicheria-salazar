import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as productApi from '@/features/admin/admin-product-api';
import {
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '@/features/admin/use-admin-product-mutations';

vi.mock('@/features/admin/admin-product-api');

const payload = {
  name: 'Ceviche',
  description: 'Fresco',
  price: 32,
  rating: null,
  categoryId: 2,
  stock: 5,
  active: true,
  available: true,
};
const saved = { id: 1, ...payload, categoryName: 'Ceviches', images: [] };

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

function expectInvalidated(invalidate: ReturnType<typeof vi.spyOn>) {
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'products'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'categories'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog'] });
}

describe('mutaciones de platos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('crear invalida la lista del panel, las categorías y la tienda', async () => {
    vi.mocked(productApi.createProduct).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreateProduct(), { wrapper });

    await act(() => result.current.mutateAsync({ payload, images: [] }));

    expect(productApi.createProduct).toHaveBeenCalledWith(payload, []);
    expectInvalidated(invalidate);
  });

  it('editar invalida la lista del panel, las categorías y la tienda', async () => {
    vi.mocked(productApi.updateProduct).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProduct(), { wrapper });

    await act(() => result.current.mutateAsync({ id: 1, payload, images: [] }));

    expect(productApi.updateProduct).toHaveBeenCalledWith(1, payload, []);
    expectInvalidated(invalidate);
  });

  it('eliminar invalida la lista del panel, las categorías y la tienda', async () => {
    vi.mocked(productApi.deleteProduct).mockResolvedValue(undefined);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useDeleteProduct(), { wrapper });

    await act(() => result.current.mutateAsync(1));

    expect(productApi.deleteProduct).toHaveBeenCalledWith(1);
    expectInvalidated(invalidate);
  });
});
