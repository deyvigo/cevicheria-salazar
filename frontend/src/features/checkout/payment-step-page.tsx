import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/button';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/features/carrito/cart-store';
import { OrderSummary } from '@/features/carrito/components/order-summary';
import { computeOrderSummary } from '@/features/carrito/order-summary';
import { useCartProducts } from '@/features/carrito/use-cart-products';
import { Notification } from '@/components/notification';
import { CheckoutStepper } from '@/features/checkout/components/checkout-stepper';
import { CashOnDeliveryForm } from '@/features/checkout/components/cash-on-delivery-form';
import { PaymentMethodSelector } from '@/features/checkout/components/payment-method-selector';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { parseCashAmount, validateCashAmount } from '@/features/checkout/cash-amount';
import { redirectToCheckout } from '@/features/checkout/redirect-to-checkout';
import { useCreateOrder, createOrderErrorMessage } from '@/features/checkout/use-create-order';
import { useDeliveryCost } from '@/features/checkout/use-delivery-cost';
import { formatPrice } from '@/features/catalogo/format';

export function PaymentStepPage() {
  const { user } = useAuth();
  const items = useCartStore((state) => state.items);
  const deliveryType = useCheckoutStore((state) => state.deliveryType);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const collectionMethod = useCheckoutStore((state) => state.collectionMethod);
  const setCollectionMethod = useCheckoutStore((state) => state.setCollectionMethod);
  const cashAmount = useCheckoutStore((state) => state.cashAmount);
  const setCashAmount = useCheckoutStore((state) => state.setCashAmount);
  const startedAsVisitor = useCheckoutStore((state) => state.startedAsVisitor);

  const isDelivery = deliveryType === 'delivery';
  const cost = useDeliveryCost(selectedAddressId, isDelivery);

  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const products = useCartProducts(ids);
  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]));
  const summary = computeOrderSummary(items, productsById);

  const delivery: number | 'loading' = isDelivery ? (cost.data ? cost.data.price : 'loading') : 0;

  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isOnline = paymentMethod === 'online';
  const isCash = paymentMethod === 'cash_on_delivery';
  const total = summary !== null && delivery !== 'loading' ? summary.total + delivery : null;
  // Once the order exists the customer is on their way to the provider: a second click would create another order
  const canPay = isOnline && total !== null && !cost.isError && !createOrder.isPending && !createOrder.isSuccess;

  const cashAmountError = validateCashAmount(cashAmount, total);
  const canConfirm =
    isCash &&
    collectionMethod !== null &&
    cashAmountError === null &&
    total !== null &&
    !cost.isError &&
    !createOrder.isPending &&
    !createOrder.isSuccess;

  function submit() {
    setErrorMessage(null);
    const base = {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      deliveryType: isDelivery ? ('ENTREGA' as const) : ('RECOJO' as const),
      addressId: isDelivery ? selectedAddressId : null,
    };
    if (isCash && collectionMethod !== null) {
      // The amount only travels with cash and only when the customer filled it in
      const amount = collectionMethod === 'cash' ? parseCashAmount(cashAmount) : null;
      createOrder.mutate(
        {
          ...base,
          paymentMethod: 'CONTRAENTREGA',
          collection: { method: collectionMethod === 'cash' ? 'EFECTIVO' : 'YAPE', cashAmount: amount },
        },
        {
          onSuccess: (created) => void navigate(`/checkout/resultado?pedido=${created.orderId}`),
          onError: (error) => setErrorMessage(createOrderErrorMessage(error, true)),
        },
      );
      return;
    }
    createOrder.mutate(
      { ...base, paymentMethod: 'ONLINE' },
      {
        onSuccess: (created) => {
          if (created.checkoutUrl) redirectToCheckout(created.checkoutUrl);
        },
        onError: (error) => setErrorMessage(createOrderErrorMessage(error)),
      },
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">Pago</h1>
      <CheckoutStepper currentStep="payment" isAuthenticated={user !== null && !startedAsVisitor} />
      <div className="grid items-start gap-6 md:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">Métodos de pago</h2>
          <PaymentMethodSelector value={paymentMethod} deliveryType={deliveryType} onChange={setPaymentMethod} />
          {isCash ? (
            <CashOnDeliveryForm
              deliveryType={deliveryType}
              method={collectionMethod}
              cashAmount={cashAmount}
              total={total}
              onMethodChange={setCollectionMethod}
              onCashAmountChange={setCashAmount}
            />
          ) : null}
          {isDelivery && cost.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-base text-ink-muted">No pudimos calcular el costo de delivery.</p>
              <Button variant="secondary" onClick={() => void cost.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : null}
        </div>
        <aside className="sticky top-24 border-l border-border pl-6">
          <OrderSummary summary={summary} delivery={delivery}>
            <div className="flex flex-col gap-3">
              {isOnline ? (
                <Button className="w-full" disabled={!canPay} onClick={submit}>
                  {total === null ? 'Pagar' : `Pagar ${formatPrice(total)}`}
                </Button>
              ) : isCash ? (
                <Button className="w-full" disabled={!canConfirm} onClick={submit}>
                  {total === null ? 'Confirmar pedido' : `Confirmar pedido ${formatPrice(total)}`}
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  Continuar
                </Button>
              )}
              <Link
                to="/checkout/direcciones"
                className="text-center text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
              >
                Volver
              </Link>
            </div>
          </OrderSummary>
        </aside>
      </div>
      {errorMessage ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification
            variant="error"
            title={isCash ? 'No pudimos confirmar el pedido' : 'No pudimos iniciar el pago'}
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
          />
        </div>
      ) : null}
    </main>
  );
}
