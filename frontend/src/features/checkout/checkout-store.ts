import { create } from 'zustand';

export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'online' | 'cash_on_delivery';
export type CollectionMethod = 'cash' | 'yape';

interface CheckoutState {
  entered: boolean;
  // The purchase began without a session, so the login step stays in the stepper after signing in
  startedAsVisitor: boolean;
  deliveryType: DeliveryType;
  selectedAddressId: number | null;
  paymentMethod: PaymentMethod | null;
  // How the customer will pay on delivery; kept as typed text so a half-written amount is not lost
  collectionMethod: CollectionMethod | null;
  cashAmount: string;
  enter: (startedAsVisitor?: boolean) => void;
  setDeliveryType: (type: DeliveryType) => void;
  selectAddress: (id: number | null) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setCollectionMethod: (method: CollectionMethod | null) => void;
  setCashAmount: (amount: string) => void;
  reset: () => void;
}

const INITIAL = {
  entered: false,
  startedAsVisitor: false,
  deliveryType: 'delivery' as DeliveryType,
  selectedAddressId: null,
  paymentMethod: null as PaymentMethod | null,
  collectionMethod: null as CollectionMethod | null,
  cashAmount: '',
};

// Deliberately not persisted: a reload or a direct visit must start over from the cart
export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...INITIAL,
  enter: (startedAsVisitor = false) => set({ entered: true, startedAsVisitor }),
  // The cash-on-delivery wording depends on the delivery type, so a stale choice is dropped
  setDeliveryType: (deliveryType) => set({ deliveryType, paymentMethod: null }),
  selectAddress: (selectedAddressId) => set({ selectedAddressId }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCollectionMethod: (collectionMethod) => set({ collectionMethod }),
  setCashAmount: (cashAmount) => set({ cashAmount }),
  reset: () => set(INITIAL),
}));
