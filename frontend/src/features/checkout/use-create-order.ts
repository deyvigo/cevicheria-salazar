import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { createOrder, type CreateOrderPayload } from '@/features/checkout/checkout-api';
import type { ApiErrorResponse } from '@/lib/api';

const GENERIC_ERROR = 'No pudimos iniciar el pago. Intenta de nuevo.';

// Stock, availability and coverage errors come with a message written for the customer; the rest stay generic
export function createOrderErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    if ((status === 409 || status === 422) && error.response?.data.message) return error.response.data.message;
  }
  return GENERIC_ERROR;
}

export function useCreateOrder() {
  return useMutation({ mutationFn: (payload: CreateOrderPayload) => createOrder(payload) });
}
