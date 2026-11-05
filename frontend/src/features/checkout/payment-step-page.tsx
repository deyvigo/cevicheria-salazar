import { Link } from 'react-router-dom';
import { Button } from '@/components/button';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/features/carrito/cart-store';
import { OrderSummary } from '@/features/carrito/components/order-summary';
import { computeOrderSummary } from '@/features/carrito/order-summary';
import { useCartProducts } from '@/features/carrito/use-cart-products';
import { CheckoutStepper } from '@/features/checkout/components/checkout-stepper';
import { PaymentMethodSelector } from '@/features/checkout/components/payment-method-selector';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { useDeliveryCost } from '@/features/checkout/use-delivery-cost';

export function PaymentStepPage() {
  const { user } = useAuth();
  const items = useCartStore((state) => state.items);
  const deliveryType = useCheckoutStore((state) => state.deliveryType);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod);
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod);
  const startedAsVisitor = useCheckoutStore((state) => state.startedAsVisitor);

  const isDelivery = deliveryType === 'delivery';
  const cost = useDeliveryCost(selectedAddressId, isDelivery);

  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const products = useCartProducts(ids);
  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]));
  const summary = computeOrderSummary(items, productsById);

  const delivery: number | 'loading' = isDelivery ? (cost.data ? cost.data.price : 'loading') : 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">Pago</h1>
      <CheckoutStepper currentStep="payment" isAuthenticated={user !== null && !startedAsVisitor} />
      <div className="grid items-start gap-6 md:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">Métodos de pago</h2>
          <PaymentMethodSelector value={paymentMethod} deliveryType={deliveryType} onChange={setPaymentMethod} />
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
              {/* Online payment (HU-19) and cash on delivery (HU-20) don't exist yet */}
              <Button className="w-full" disabled>
                Continuar
              </Button>
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
    </main>
  );
}
