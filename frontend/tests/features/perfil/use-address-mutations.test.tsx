import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as addressApi from '@/features/perfil/address-api';
import { useCreateAddress, useDeleteAddress, useUpdateAddress } from '@/features/perfil/use-address-mutations';
import { ADDRESSES_QUERY_KEY } from '@/features/perfil/use-addresses';

vi.mock('@/features/perfil/address-api');

const payload = { label: 'Casa', address: 'Calle 1', reference: null, latitude: -12.0464, longitude: -77.0428 };
const saved = { id: 1, ...payload };

function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { invalidate, wrapper };
}

describe('mutaciones de direcciones', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('crear invalida la lista de direcciones', async () => {
    vi.mocked(addressApi.createAddress).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreateAddress(), { wrapper });

    await act(() => result.current.mutateAsync(payload));

    expect(addressApi.createAddress).toHaveBeenCalledWith(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ADDRESSES_QUERY_KEY });
  });

  it('editar invalida la lista de direcciones', async () => {
    vi.mocked(addressApi.updateAddress).mockResolvedValue(saved);
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useUpdateAddress(), { wrapper });

    await act(() => result.current.mutateAsync({ id: 1, payload }));

    expect(addressApi.updateAddress).toHaveBeenCalledWith(1, payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ADDRESSES_QUERY_KEY });
  });

  it('eliminar llama a la API y deja que quien llama invalide la lista', async () => {
    vi.mocked(addressApi.deleteAddress).mockResolvedValue();
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useDeleteAddress(), { wrapper });

    await act(() => result.current.mutateAsync(1));

    expect(addressApi.deleteAddress).toHaveBeenCalledWith(1);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('si crear falla, no invalida la lista', async () => {
    vi.mocked(addressApi.createAddress).mockRejectedValue(new Error('fail'));
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreateAddress(), { wrapper });

    await act(() => result.current.mutateAsync(payload).catch(() => undefined));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
