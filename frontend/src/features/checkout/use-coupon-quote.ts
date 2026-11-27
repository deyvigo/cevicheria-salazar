import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { quoteCoupon, type CouponQuote, type OrderItemPayload } from '@/features/checkout/checkout-api';
import type { ApiErrorResponse } from '@/lib/api';

const COUPON_REASONS = ['NOT_FOUND', 'EXPIRED', 'NOT_STARTED', 'MIN_SUBTOTAL', 'EXHAUSTED'];
const GENERIC_ERROR = 'No pudimos validar el código. Intenta de nuevo.';

export function couponQueryKey(code: string | null, items: OrderItemPayload[]) {
  return ['coupon-quote', code, items] as const;
}

// The server answers 422 with the reason in "error" when the coupon does not apply to this customer and cart
export function isCouponRejection(error: unknown): boolean {
  return (
    isAxiosError<ApiErrorResponse>(error) &&
    error.response?.status === 422 &&
    COUPON_REASONS.includes(error.response.data.error)
  );
}

export function couponErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    if ((isCouponRejection(error) || status === 429) && error.response?.data.message) {
      return error.response.data.message;
    }
  }
  return GENERIC_ERROR;
}

export function useCouponQuote(code: string | null, items: OrderItemPayload[]) {
  return useQuery({
    queryKey: couponQueryKey(code, items),
    queryFn: () => quoteCoupon(code ?? '', items),
    enabled: code !== null && items.length > 0,
    // Keeps the last discount on screen while a changed cart is quoted again
    placeholderData: keepPreviousData,
    // Fresh long enough for the quote seeded by applying; a changed cart is a new key and is quoted right away
    staleTime: 30_000,
    retry: false,
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, items }: { code: string; items: OrderItemPayload[] }) => quoteCoupon(code, items),
    // Seeds the quote the summary reads, so applying does not ask the server twice
    onSuccess: (quote: CouponQuote, { items }) => queryClient.setQueryData(couponQueryKey(quote.code, items), quote),
  });
}
