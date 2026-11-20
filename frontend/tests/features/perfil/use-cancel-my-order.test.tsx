import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as orderApi from '@/features/perfil/order-api';
import { useCancelMyOrder } from '@/features/perfil/use-cancel-my-order';

vi.mock('@/features/perfil/order-api');

describe('useCancelMyOrder', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['con éxito', () => vi.mocked(orderApi.cancelMyOrder).mockResolvedValue()],
    ['con conflicto', () => vi.mocked(orderApi.cancelMyOrder).mockRejectedValue(new Error('409'))],
  ])('invalida la lista y el detalle del pedido %s', async (_name, arrange) => {
    arrange();
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCancelMyOrder(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(42).catch(() => undefined);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['my-orders'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['order', 42] });
  });
});
