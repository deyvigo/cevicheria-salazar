import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/button';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/features/carrito/cart-store';
import { OrderSummary } from '@/features/carrito/components/order-summary';
import { computeOrderSummary } from '@/features/carrito/order-summary';
import { useCartProducts } from '@/features/carrito/use-cart-products';
import { AddressOptionList } from '@/features/checkout/components/address-option-list';
import { CheckoutStepper } from '@/features/checkout/components/checkout-stepper';
import { CoverageNotice } from '@/features/checkout/components/coverage-notice';
import { DeliveryTypeSelector } from '@/features/checkout/components/delivery-type-selector';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { useDeliveryCost } from '@/features/checkout/use-delivery-cost';
import { AddressDialog } from '@/features/perfil/components/address-dialog';
import { useAddresses } from '@/features/perfil/use-addresses';

export function DeliveryStepPage() {
  const { user } = useAuth();
  const items = useCartStore((state) => state.items);
  const deliveryType = useCheckoutStore((state) => state.deliveryType);
  const setDeliveryType = useCheckoutStore((state) => state.setDeliveryType);
  const selectedAddressId = useCheckoutStore((state) => state.selectedAddressId);
  const selectAddress = useCheckoutStore((state) => state.selectAddress);
  const startedAsVisitor = useCheckoutStore((state) => state.startedAsVisitor);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isDelivery = deliveryType === 'delivery';
  const addresses = useAddresses();
  const cost = useDeliveryCost(selectedAddressId, isDelivery);

  const ids = items.map((item) => item.productId).sort((a, b) => a - b);
  const products = useCartProducts(ids);
  const productsById = new Map((products.data ?? []).map((product) => [product.id, product]));
  const summary = computeOrderSummary(items, productsById);

  // A deleted address can't stay selected
  const loadedAddresses = addresses.data;
  useEffect(() => {
    if (loadedAddresses && selectedAddressId !== null && !loadedAddresses.some((a) => a.id === selectedAddressId)) {
      selectAddress(null);
    }
  }, [loadedAddresses, selectedAddressId, selectAddress]);

  const hasSelection = isDelivery && selectedAddressId !== null;
  let delivery: number | 'loading' = 0;
  if (hasSelection) {
    delivery = cost.data ? cost.data.price : 'loading';
  }
  const notCovered = hasSelection && cost.data?.covered === false;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">Entrega</h1>
      <CheckoutStepper currentStep="delivery" isAuthenticated={user !== null && !startedAsVisitor} />
      <div className="grid items-start gap-6 md:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <DeliveryTypeSelector value={deliveryType} onChange={setDeliveryType} />
          {isDelivery ? (
            <AddressOptionList
              addresses={loadedAddresses}
              isPending={addresses.isPending}
              isError={addresses.isError}
              selectedId={selectedAddressId}
              onSelect={selectAddress}
              onAdd={() => setDialogOpen(true)}
              onRetry={() => void addresses.refetch()}
            />
          ) : null}
          {hasSelection && cost.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-base text-ink-muted">No pudimos calcular el costo de delivery.</p>
              <Button variant="secondary" onClick={() => void cost.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : null}
          {notCovered ? <CoverageNotice /> : null}
        </div>
        <aside className="sticky top-24 border-l border-border pl-6">
          <OrderSummary summary={summary} delivery={delivery}>
            <div className="flex flex-col gap-3">
              {/* Payment (HU-18) doesn't exist yet */}
              <Button className="w-full" disabled>
                Continuar
              </Button>
              <Link
                to="/cart"
                className="text-center text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none"
              >
                Volver al carrito
              </Link>
            </div>
          </OrderSummary>
        </aside>
      </div>
      <AddressDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(_message, saved) => {
          setDialogOpen(false);
          selectAddress(saved.id);
        }}
      />
    </main>
  );
}
