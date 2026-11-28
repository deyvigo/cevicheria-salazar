import { useQuery } from '@tanstack/react-query';
import { getFeaturedProducts } from '@/features/catalogo/catalog-api';

// Under the catalog key so admin changes to dishes refresh it like the rest of the storefront
export function useFeaturedProducts() {
  return useQuery({ queryKey: ['catalog', 'featured'], queryFn: getFeaturedProducts });
}
