import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogSort } from '@/features/catalogo/catalog-sort';
import { getCategories, getProducts } from '@/features/catalogo/catalog-api';

export function useCategories() {
  return useQuery({ queryKey: ['catalog', 'categories'], queryFn: getCategories, staleTime: 5 * 60_000 });
}

export function useProducts(category: string, page: number, sort: CatalogSort) {
  return useQuery({
    queryKey: ['catalog', 'products', category, page, sort],
    queryFn: () => getProducts({ category, page, sort }),
    placeholderData: keepPreviousData,
  });
}
