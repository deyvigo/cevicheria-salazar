import { create } from 'zustand';

export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'online' | 'cash_on_delivery';

interface CheckoutState {
  entered: boolean;
  // The purchase began without a session, so the login step stays in the stepper after signing in
  startedAsVisitor: boolean;
  deliveryType: DeliveryType;
  selectedAddressId: number | null;
  paymentMethod: PaymentMethod | null;
  enter: (startedAsVisitor?: boolean) => void;
  setDeliveryType: (type: DeliveryType) => void;
  selectAddress: (id: number | null) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  reset: () => void;
}

const INITIAL = {
  entered: false,
  startedAsVisitor: false,
  deliveryType: 'delivery' as DeliveryType,
  selectedAddressId: null,
  paymentMethod: null as PaymentMethod | null,
};

// Deliberately not persisted: a reload or a direct visit must start over from the cart
export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...INITIAL,
  enter: (startedAsVisitor = false) => set({ entered: true, startedAsVisitor }),
  // The cash-on-delivery wording depends on the delivery type, so a stale choice is dropped
  setDeliveryType: (deliveryType) => set({ deliveryType, paymentMethod: null }),
  selectAddress: (selectedAddressId) => set({ selectedAddressId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  reset: () => set(INITIAL),
}));
