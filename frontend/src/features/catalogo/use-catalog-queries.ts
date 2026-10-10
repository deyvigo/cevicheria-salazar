import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CatalogSort } from '@/features/catalogo/catalog-sort';
import {
  getCategories,
  getProduct,
  getProducts,
  type Page,
  type Product,
  type ProductDetail,
} from '@/features/catalogo/catalog-api';

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useProducts(category: string, page: number, sort: CatalogSort) {
  return useQuery({
    queryKey: ['catalog', 'products', category, page, sort],
    queryFn: () => getProducts({ category, page, sort }),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: number | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['catalog', 'product', id],
    queryFn: () => getProduct(id as number),
    enabled: id !== null,
    retry: false,
    // Paint what the list already knows right away so the shared image doesn't wait on the network
    placeholderData: (): ProductDetail | undefined => {
      const pages = queryClient.getQueriesData<Page<Product>>({
        queryKey: ['catalog', 'products'],
      });
      for (const [, page] of pages) {
        const found = page?.items.find((item) => item.id === id);
        if (found) {
          return {
            id: found.id,
            name: found.name,
            description: found.description,
            price: found.price,
            rating: found.rating,
            available: null,
            category: null,
            images: found.imageUrl ? [found.imageUrl] : [],
          };
        }
      }
      return undefined;
    },
  });
}
