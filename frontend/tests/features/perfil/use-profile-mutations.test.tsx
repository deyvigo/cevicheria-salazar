import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/context/auth-context';
import { ME_QUERY_KEY } from '@/features/auth/me-query-key';
import * as profileApi from '@/features/perfil/profile-api';
import { useChangePassword, useUpdateProfile } from '@/features/perfil/use-profile-mutations';

vi.mock('@/features/perfil/profile-api');

const google: AuthUser = {
  id: 1,
  email: 'ana@correo.com',
  firstName: 'Ana',
  lastName: 'Torres',
  phone: '',
  role: 'CLIENTE',
  hasPassword: false,
};

function setup() {
  const client = new QueryClient();
  client.setQueryData(ME_QUERY_KEY, google);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('mutaciones del perfil', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('guardar los datos actualiza el usuario en el caché de la sesión', async () => {
    vi.mocked(profileApi.updateProfile).mockResolvedValue({ ...google, firstName: 'Lucía', phone: '912345678' });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(() => result.current.mutateAsync({ firstName: 'Lucía', lastName: 'Torres', phone: '912345678' }));

    expect(client.getQueryData<AuthUser>(ME_QUERY_KEY)).toMatchObject({ firstName: 'Lucía', phone: '912345678' });
  });

  it('crear la contraseña marca hasPassword en el caché', async () => {
    vi.mocked(profileApi.changePassword).mockResolvedValue();
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    await act(() => result.current.mutateAsync({ newPassword: 'nueva5678' }));

    await waitFor(() => expect(client.getQueryData<AuthUser>(ME_QUERY_KEY)?.hasPassword).toBe(true));
  });
});
