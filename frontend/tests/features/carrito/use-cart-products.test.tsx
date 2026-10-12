import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as cartApi from '@/features/carrito/cart-api';
import { useCartStore } from '@/features/carrito/cart-store';
import { useCartProducts } from '@/features/carrito/use-cart-products';

vi.mock('@/features/carrito/cart-api');

beforeEach(() => {
  vi.mocked(cartApi.getProductsByIds).mockReset();
  localStorage.clear();
  useCartStore.setState({ items: [], lastAdded: null });
});

describe('useCartProducts', () => {
  it('pide los platos por id y no consulta con el carrito vacío', async () => {
    vi.mocked(cartApi.getProductsByIds).mockResolvedValue([]);

    const empty = renderHook(() => useCartProducts([]), { wrapper: QueryWrapper });
    expect(empty.result.current.fetchStatus).toBe('idle');
    expect(cartApi.getProductsByIds).not.toHaveBeenCalled();

    renderHook(() => useCartProducts([3, 9]), { wrapper: QueryWrapper });
    await waitFor(() => expect(cartApi.getProductsByIds).toHaveBeenCalledWith([3, 9]));
  });

  it('expone el error de red sin tocar el store', async () => {
    useCartStore.setState({ items: [{ productId: 3, quantity: 2 }] });
    vi.mocked(cartApi.getProductsByIds).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useCartProducts([3]), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useCartStore.getState().items).toEqual([{ productId: 3, quantity: 2 }]);
  });
});
