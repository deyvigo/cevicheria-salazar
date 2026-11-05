import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { createOrder, type CreateOrderPayload } from '@/features/checkout/checkout-api';
import type { ApiErrorResponse } from '@/lib/api';

const GENERIC_ERROR = 'No pudimos iniciar el pago. Intenta de nuevo.';
const GENERIC_CASH_ERROR = 'No pudimos confirmar el pedido. Intenta de nuevo.';

// Stock, availability and coverage errors come with a message written for the customer; the rest stay generic
export function createOrderErrorMessage(error: unknown, cashOnDelivery = false): string {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status;
    if ((status === 409 || status === 422) && error.response?.data.message) return error.response.data.message;
    // Validation messages (such as a cash amount below the total) are also written for the customer
    const fieldMessage = error.response?.data.fieldErrors?.[0]?.message;
    if (status === 400 && cashOnDelivery && fieldMessage) return fieldMessage;
  }
  return cashOnDelivery ? GENERIC_CASH_ERROR : GENERIC_ERROR;
}

export function useCreateOrder() {
  return useMutation({ mutationFn: (payload: CreateOrderPayload) => createOrder(payload) });
}
