import type { Page } from '@/features/catalogo/catalog-api';
import { api } from '@/lib/api';

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  productCount: number;
}

export interface CategoryPayload {
  name: string;
  slug: string;
}

export async function listAdminCategories(params: { q?: string; page: number }): Promise<Page<AdminCategory>> {
  const { data } = await api.get<Page<AdminCategory>>('/admin/categories', { params });
  return data;
}

export async function createCategory(payload: CategoryPayload): Promise<AdminCategory> {
  const { data } = await api.post<AdminCategory>('/admin/categories', payload);
  return data;
}

export async function updateCategory(id: number, payload: CategoryPayload): Promise<AdminCategory> {
  const { data } = await api.put<AdminCategory>(`/admin/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}
