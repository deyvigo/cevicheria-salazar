import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as zoneApi from '@/features/admin/admin-delivery-zone-api';
import {
  useCreateDeliveryZone,
  useDeleteDeliveryZone,
  useUpdateDeliveryZone,
} from '@/features/admin/use-admin-delivery-zone-mutations';

vi.mock('@/features/admin/admin-delivery-zone-api');

const payload = {
  name: 'Miraflores',
  price: 8,
  color: 'celeste' as const,
  active: true,
  coordinates: [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
  ],
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

describe('mutaciones de zonas de delivery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('crear invalida la lista de zonas', async () => {
    vi.mocked(zoneApi.createDeliveryZone).mockResolvedValue({ id: 1, ...payload });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateDeliveryZone(), { wrapper });

    result.current.mutate(payload);

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'delivery-zones'] }));
  });

  it('editar invalida la lista de zonas', async () => {
    vi.mocked(zoneApi.updateDeliveryZone).mockResolvedValue({ id: 1, ...payload });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateDeliveryZone(), { wrapper });

    result.current.mutate({ id: 1, payload });

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'delivery-zones'] }));
    expect(zoneApi.updateDeliveryZone).toHaveBeenCalledWith(1, payload);
  });

  it('eliminar invalida la lista de zonas', async () => {
    vi.mocked(zoneApi.deleteDeliveryZone).mockResolvedValue();
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteDeliveryZone(), { wrapper });

    result.current.mutate(1);

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'delivery-zones'] }));
  });

  it('si falla no invalida la lista', async () => {
    vi.mocked(zoneApi.createDeliveryZone).mockRejectedValue(new Error('x'));
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateDeliveryZone(), { wrapper });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
