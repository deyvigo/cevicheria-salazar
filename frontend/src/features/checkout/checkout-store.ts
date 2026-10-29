import { create } from 'zustand';

export type DeliveryType = 'delivery' | 'pickup';

interface CheckoutState {
  entered: boolean;
  // The purchase began without a session, so the login step stays in the stepper after signing in
  startedAsVisitor: boolean;
  deliveryType: DeliveryType;
  selectedAddressId: number | null;
  enter: (startedAsVisitor?: boolean) => void;
  setDeliveryType: (type: DeliveryType) => void;
  selectAddress: (id: number | null) => void;
  reset: () => void;
}

const INITIAL = { entered: false, startedAsVisitor: false, deliveryType: 'delivery' as DeliveryType, selectedAddressId: null };

// Deliberately not persisted: a reload or a direct visit must start over from the cart
export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...INITIAL,
  enter: (startedAsVisitor = false) => set({ entered: true, startedAsVisitor }),
  setDeliveryType: (deliveryType) => set({ deliveryType }),
  selectAddress: (selectedAddressId) => set({ selectedAddressId }),
  reset: () => set(INITIAL),
}));
