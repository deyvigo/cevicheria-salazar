import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as orderApi from '@/features/perfil/order-api';
import { useMyOrders } from '@/features/perfil/use-my-orders';
import { QueryWrapper } from '@tests/utils/query-wrapper';

vi.mock('@/features/perfil/order-api');

describe('useMyOrders', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(orderApi.listMyOrders).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('hace una consulta distinta por página', async () => {
    const { rerender } = renderHook(({ page }) => useMyOrders(page), {
      wrapper: QueryWrapper,
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(orderApi.listMyOrders).toHaveBeenCalledWith(1));

    rerender({ page: 2 });

    await waitFor(() => expect(orderApi.listMyOrders).toHaveBeenCalledWith(2));
  });
});
