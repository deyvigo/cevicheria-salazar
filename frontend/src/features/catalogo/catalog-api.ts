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
  // Only drives the add-to-cart button; never shown on the card
  available: boolean;
  stock: number;
}

export interface ProductDetail {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number | null;
  // null until the server confirms it, like availability: the list placeholder doesn't carry it
  reviewCount: number | null;
  // null until the server confirms it: the list placeholder doesn't carry availability
  available: boolean | null;
  stock: number | null;
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

export async function getCategories(q?: string): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories', { params: { q } });
  return data;
}

export async function getProducts(params: {
  category?: string;
  q?: string;
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

export interface Review {
  id: number;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  edited: boolean;
}

export interface MyReview {
  canReview: boolean;
  review: Review | null;
}

export interface ReviewInput {
  rating: number;
  comment: string;
}

export type ReviewFilter = 'all' | 'positive' | 'neutral' | 'negative';

export async function getReviews(
  productId: number,
  page: number,
  filter: ReviewFilter = 'all',
): Promise<Page<Review>> {
  const { data } = await api.get<Page<Review>>(`/products/${productId}/reviews`, {
    params: { page, filter: filter === 'all' ? undefined : filter },
  });
  return data;
}

export async function getMyReview(productId: number): Promise<MyReview> {
  const { data } = await api.get<MyReview>(`/products/${productId}/reviews/mine`);
  return data;
}

export async function saveMyReview(productId: number, input: ReviewInput): Promise<Review> {
  const { data } = await api.put<Review>(`/products/${productId}/reviews/mine`, input);
  return data;
}

export async function deleteMyReview(productId: number): Promise<void> {
  await api.delete(`/products/${productId}/reviews/mine`);
}
