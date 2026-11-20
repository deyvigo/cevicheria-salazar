import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteMyReview,
  getMyReview,
  getReviews,
  type ReviewFilter,
  saveMyReview,
  type ReviewInput,
} from '@/features/catalogo/catalog-api';

export function useReviews(productId: number, filter: ReviewFilter = 'all') {
  return useInfiniteQuery({
    queryKey: ['catalog', 'reviews', productId, filter],
    queryFn: ({ pageParam }) => getReviews(productId, pageParam, filter),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    select: (data) => {
      // A review published while scrolling shifts the next page and can repeat one already shown
      const seen = new Set<number>();
      const items = data.pages
        .flatMap((page) => page.items)
        .filter((review) => (seen.has(review.id) ? false : (seen.add(review.id), true)));
      return { items, total: data.pages[0]?.totalItems ?? 0 };
    },
  });
}

export function useMyReview(productId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'my-review', productId],
    queryFn: () => getMyReview(productId),
    enabled,
    retry: false,
  });
}

function useRefreshAfterChange(productId: number) {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['catalog', 'reviews', productId] }),
      client.invalidateQueries({ queryKey: ['catalog', 'my-review', productId] }),
      client.invalidateQueries({ queryKey: ['catalog', 'product', productId] }),
    ]);
}

export function useSaveReview(productId: number) {
  const refresh = useRefreshAfterChange(productId);
  return useMutation({
    mutationFn: (input: ReviewInput) => saveMyReview(productId, input),
    onSuccess: refresh,
  });
}

export function useDeleteReview(productId: number) {
  const refresh = useRefreshAfterChange(productId);
  return useMutation({
    mutationFn: () => deleteMyReview(productId),
    onSuccess: refresh,
  });
}
