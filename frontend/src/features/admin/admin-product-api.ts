import type { Page } from '@/features/catalogo/catalog-api';
import { api } from '@/lib/api';

export interface AdminProductImage {
  id: number;
  url: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number | null;
  categoryId: number;
  categoryName: string;
  stock: number;
  active: boolean;
  available: boolean;
  images: AdminProductImage[];
}

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  categoryId: number;
  stock: number;
  active: boolean;
  available: boolean;
}

// One slot of the final image list: a saved image (id) or a new upload (file)
export interface ProductImageItem {
  key: string;
  url: string;
  id?: number;
  file?: File;
}

function buildForm(payload: ProductPayload, images: ProductImageItem[]): FormData {
  const files = images.flatMap((image) => (image.file ? [image.file] : []));
  let nextFile = 0;
  const entries = images.map((image) => (image.file ? { file: nextFile++ } : { id: image.id }));
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify({ ...payload, images: entries })], { type: 'application/json' }));
  files.forEach((file) => form.append('files', file));
  return form;
}

export type ProductSortField = 'name' | 'category' | 'price' | 'rating' | 'stock';
export type SortDirection = 'asc' | 'desc';

export const DEFAULT_SORT: ProductSortField = 'name';
export const DEFAULT_DIRECTION: SortDirection = 'asc';

export async function listAdminProducts(params: {
  q?: string;
  page: number;
  sort?: ProductSortField;
  dir?: SortDirection;
}): Promise<Page<AdminProduct>> {
  const { data } = await api.get<Page<AdminProduct>>('/admin/products', { params });
  return data;
}

export async function createProduct(payload: ProductPayload, images: ProductImageItem[]): Promise<AdminProduct> {
  const { data } = await api.post<AdminProduct>('/admin/products', buildForm(payload, images));
  return data;
}

export async function updateProduct(
  id: number,
  payload: ProductPayload,
  images: ProductImageItem[],
): Promise<AdminProduct> {
  const { data } = await api.put<AdminProduct>(`/admin/products/${id}`, buildForm(payload, images));
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}
