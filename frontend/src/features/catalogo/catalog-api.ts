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

export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number | null;
  // null until the server confirms it: the list placeholder doesn't carry availability
  available: boolean | null;
  category: Category | null;
  images: string[];
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

export async function getProduct(id: number): Promise<ProductDetail> {
  const { data } = await api.get<ProductDetail>(`/products/${id}`);
  return data;
}
