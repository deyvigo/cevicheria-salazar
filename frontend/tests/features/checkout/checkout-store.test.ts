import { beforeEach, describe, expect, it } from 'vitest';
import { useCheckoutStore } from '@/features/checkout/checkout-store';

beforeEach(() => {
  localStorage.clear();
  useCheckoutStore.getState().reset();
});

describe('checkout store', () => {
  it('empieza vacío con Entrega preseleccionada', () => {
    expect(useCheckoutStore.getState()).toMatchObject({
      entered: false,
      deliveryType: 'delivery',
      selectedAddressId: null,
    });
  });

  it('enter marca que se llegó desde el carrito y reset lo limpia todo', () => {
    const store = useCheckoutStore.getState();
    store.enter();
    store.setDeliveryType('pickup');
    store.selectAddress(4);

    expect(useCheckoutStore.getState()).toMatchObject({ entered: true, deliveryType: 'pickup', selectedAddressId: 4 });

    useCheckoutStore.getState().reset();

    expect(useCheckoutStore.getState()).toMatchObject({
      entered: false,
      deliveryType: 'delivery',
      selectedAddressId: null,
    });
  });

  it('enter recuerda si la compra empezó sin sesión y reset lo olvida', () => {
    useCheckoutStore.getState().enter(true);
    expect(useCheckoutStore.getState().startedAsVisitor).toBe(true);

    useCheckoutStore.getState().reset();
    useCheckoutStore.getState().enter();

    expect(useCheckoutStore.getState().startedAsVisitor).toBe(false);
  });

  it('alternar el tipo de entrega conserva la dirección elegida', () => {
    const store = useCheckoutStore.getState();
    store.selectAddress(4);
    store.setDeliveryType('pickup');
    store.setDeliveryType('delivery');

    expect(useCheckoutStore.getState().selectedAddressId).toBe(4);
  });

  it('el detalle de contraentrega se guarda, sobrevive al cambio de método y se limpia con reset', () => {
    const store = useCheckoutStore.getState();
    store.setPaymentMethod('cash_on_delivery');
    store.setCollectionMethod('cash');
    store.setCashAmount('100');
    store.setPaymentMethod('online');
    store.setPaymentMethod('cash_on_delivery');

    expect(useCheckoutStore.getState()).toMatchObject({ collectionMethod: 'cash', cashAmount: '100' });

    useCheckoutStore.getState().reset();

    expect(useCheckoutStore.getState()).toMatchObject({ collectionMethod: null, cashAmount: '' });
  });

  it('no escribe en localStorage', () => {
    useCheckoutStore.getState().enter();
    useCheckoutStore.getState().selectAddress(4);

    expect(localStorage.length).toBe(0);
  });

  it('el método de pago empieza vacío, se guarda y se limpia con reset o al cambiar el tipo de entrega', () => {
    expect(useCheckoutStore.getState().paymentMethod).toBeNull();

    useCheckoutStore.getState().setPaymentMethod('online');
    expect(useCheckoutStore.getState().paymentMethod).toBe('online');

    useCheckoutStore.getState().setDeliveryType('pickup');
    expect(useCheckoutStore.getState().paymentMethod).toBeNull();

    useCheckoutStore.getState().setPaymentMethod('cash_on_delivery');
    useCheckoutStore.getState().reset();
    expect(useCheckoutStore.getState().paymentMethod).toBeNull();
  });
});
