import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listAdminProducts, type ProductSortField, type SortDirection } from '@/features/admin/admin-product-api';

export const ADMIN_PRODUCTS_QUERY_KEY = ['admin', 'products'] as const;

export function useAdminProducts(q: string | undefined, page: number, sort: ProductSortField, dir: SortDirection) {
  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, q ?? null, page, sort, dir],
    queryFn: () => listAdminProducts({ q, page, sort, dir }),
    placeholderData: keepPreviousData,
  });
}
