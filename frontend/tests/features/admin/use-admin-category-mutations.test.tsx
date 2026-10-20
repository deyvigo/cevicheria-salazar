import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoryApi from '@/features/admin/admin-category-api';
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/features/admin/use-admin-category-mutations';

vi.mock('@/features/admin/admin-category-api');

const payload = { name: 'Postres', slug: 'postres' };
const saved = { id: 1, ...payload, productCount: 0 };

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

describe('mutaciones de categorías', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('crear invalida la lista del panel y el catálogo de la tienda', async () => {
    vi.mocked(categoryApi.createCategory).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreateCategory(), { wrapper });

    await act(() => result.current.mutateAsync(payload));

    expect(categoryApi.createCategory).toHaveBeenCalledWith(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'categories'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog'] });
  });

  it('editar invalida la lista del panel y el catálogo de la tienda', async () => {
    vi.mocked(categoryApi.updateCategory).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(() => result.current.mutateAsync({ id: 1, payload }));

    expect(categoryApi.updateCategory).toHaveBeenCalledWith(1, payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'categories'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog'] });
  });

  it('eliminar invalida la lista del panel y el catálogo de la tienda', async () => {
    vi.mocked(categoryApi.deleteCategory).mockResolvedValue();
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useDeleteCategory(), { wrapper });

    await act(() => result.current.mutateAsync(1));

    expect(categoryApi.deleteCategory).toHaveBeenCalledWith(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'categories'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog'] });
  });

  it('si crear falla, no invalida nada', async () => {
    vi.mocked(categoryApi.createCategory).mockRejectedValue(new Error('fail'));
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreateCategory(), { wrapper });

    await act(() => result.current.mutateAsync(payload).catch(() => undefined));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
