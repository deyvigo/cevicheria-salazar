import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listAdminCategories } from '@/features/admin/admin-category-api';

export const ADMIN_CATEGORIES_QUERY_KEY = ['admin', 'categories'] as const;

export function useAdminCategories(q: string | undefined, page: number) {
  return useQuery({
    queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, q ?? null, page],
    queryFn: () => listAdminCategories({ q, page }),
    placeholderData: keepPreviousData,
  });
}
