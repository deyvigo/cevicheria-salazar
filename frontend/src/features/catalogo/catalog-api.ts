import type { CatalogSort } from '@/features/catalogo/catalog-sort';
import { api } from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number | null;
  imageUrl: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

export async function getProducts(params: {
  category: string;
  page: number;
  sort: CatalogSort;
}): Promise<Page<Product>> {
  const { data } = await api.get<Page<Product>>('/products', { params });
  return data;
}
