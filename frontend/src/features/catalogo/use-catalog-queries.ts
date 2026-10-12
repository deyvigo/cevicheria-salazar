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

export function useCategories(q?: string) {
  return useQuery({
    queryKey: ['catalog', 'categories', q ?? null],
    queryFn: () => getCategories(q),
    staleTime: 5 * 60_000,
    // Keep the list on screen while a new search loads so it doesn't flicker
    placeholderData: keepPreviousData,
  });
}

export function useProducts(category: string | undefined, q: string | undefined, page: number, sort: CatalogSort) {
  return useQuery({
    queryKey: ['catalog', 'products', category ?? null, q ?? null, page, sort],
    queryFn: () => getProducts({ category, q, page, sort }),
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
      // Opened from the cart: its products carry the same fields as a catalog card
      const cartLists = queryClient.getQueriesData<Product[]>({
        queryKey: ['catalog', 'cart-products'],
      });
      const candidates = [
        ...pages.flatMap(([, page]) => page?.items ?? []),
        ...cartLists.flatMap(([, list]) => list ?? []),
      ];
      const found = candidates.find((item) => item.id === id);
      if (!found) return undefined;
      return {
        id: found.id,
        name: found.name,
        description: found.description,
        price: found.price,
        rating: found.rating,
        available: found.available,
        stock: found.stock,
        category: null,
        images: found.imageUrl ? [found.imageUrl] : [],
      };
    },
  });
}
