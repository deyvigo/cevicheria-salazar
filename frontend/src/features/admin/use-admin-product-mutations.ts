import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductImageItem,
  type ProductPayload,
} from '@/features/admin/admin-product-api';
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin/use-admin-products';

// The category table shows how many dishes each has, and the storefront lists the dishes
function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
      queryClient.invalidateQueries({ queryKey: ['catalog'] }),
    ]);
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ payload, images }: { payload: ProductPayload; images: ProductImageItem[] }) =>
      createProduct(payload, images),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, payload, images }: { id: number; payload: ProductPayload; images: ProductImageItem[] }) =>
      updateProduct(id, payload, images),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: invalidate,
  });
}
