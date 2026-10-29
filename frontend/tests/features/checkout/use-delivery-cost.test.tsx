import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryWrapper } from '@tests/utils/query-wrapper';
import * as checkoutApi from '@/features/checkout/checkout-api';
import { useDeliveryCost } from '@/features/checkout/use-delivery-cost';

vi.mock('@/features/checkout/checkout-api');

beforeEach(() => {
  vi.mocked(checkoutApi.getDeliveryCost).mockReset();
});

describe('useDeliveryCost', () => {
  it('pide el costo de la dirección elegida', async () => {
    vi.mocked(checkoutApi.getDeliveryCost).mockResolvedValue({ covered: true, price: 8.5, zone: 'Centro' });
    const { result } = renderHook(() => useDeliveryCost(3, true), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.data).toEqual({ covered: true, price: 8.5, zone: 'Centro' }));
    expect(checkoutApi.getDeliveryCost).toHaveBeenCalledWith(3);
  });

  it('no consulta con Recojo ni sin dirección', () => {
    renderHook(() => useDeliveryCost(3, false), { wrapper: QueryWrapper });
    renderHook(() => useDeliveryCost(null, true), { wrapper: QueryWrapper });

    expect(checkoutApi.getDeliveryCost).not.toHaveBeenCalled();
  });

  it('al cambiar de dirección no devuelve el valor de la anterior mientras llega la respuesta', async () => {
    vi.mocked(checkoutApi.getDeliveryCost).mockResolvedValueOnce({ covered: true, price: 8.5, zone: 'Centro' });
    const { result, rerender } = renderHook(({ id }) => useDeliveryCost(id, true), {
      wrapper: QueryWrapper,
      initialProps: { id: 3 },
    });
    await waitFor(() => expect(result.current.data?.price).toBe(8.5));

    vi.mocked(checkoutApi.getDeliveryCost).mockReturnValue(new Promise(() => {}));
    rerender({ id: 4 });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
  });

  it('expone el error para reintentar', async () => {
    vi.mocked(checkoutApi.getDeliveryCost).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useDeliveryCost(3, true), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
