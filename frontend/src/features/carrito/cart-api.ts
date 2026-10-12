import type { Product } from '@/features/catalogo/catalog-api';
import { api } from '@/lib/api';

export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products', {
    params: { ids: ids.join(',') },
  });
  return data;
}
