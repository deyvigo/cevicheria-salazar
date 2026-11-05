import { isAxiosError } from 'axios';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { useCartStore } from '@/features/carrito/cart-store';
import { CheckoutStepper } from '@/features/checkout/components/checkout-stepper';
import { OrderCodes } from '@/features/checkout/components/order-codes';
import { useCheckoutStore } from '@/features/checkout/checkout-store';
import { useOrder } from '@/features/checkout/use-order';

// Past this the page stops asking and tells the customer they will be notified
export const ORDER_WAIT_LIMIT_MS = 2 * 60 * 1000;

const linkClass =
  'text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none';

export function OrderResultPage() {
  const [searchParams] = useSearchParams();
  const rawId = searchParams.get('pedido');
  const id = rawId !== null && /^[0-9]+$/.test(rawId) ? Number(rawId) : null;
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  const order = useOrder(id, !waitedTooLong);
  const status = order.data?.status;

  useEffect(() => {
    const timer = setTimeout(() => setWaitedTooLong(true), ORDER_WAIT_LIMIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // The cart is only emptied once the order is really paid, so cancelling at the provider never loses it
  useEffect(() => {
    if (status === 'PAGADO') {
      useCartStore.getState().clear();
      useCheckoutStore.getState().reset();
    }
  }, [status]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-[32px] leading-10 font-semibold text-ink">Tu pedido</h1>
      <CheckoutStepper currentStep="done" isAuthenticated />
      <Body id={id} order={order} waitedTooLong={waitedTooLong} />
    </main>
  );
}

function Body({
  id,
  order,
  waitedTooLong,
}: {
  id: number | null;
  order: ReturnType<typeof useOrder>;
  waitedTooLong: boolean;
}) {
  const notFound = id === null || (isAxiosError(order.error) && order.error.response?.status === 404);
  if (notFound) {
    return (
      <Message title="No encontramos el pedido">
        <Link to="/menu" className={linkClass}>
          Ver la carta
        </Link>
      </Message>
    );
  }
  if (order.isPending) {
    return <div aria-busy="true" className="h-40 animate-pulse rounded-lg bg-surface-celeste" />;
  }
  if (order.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4">
        <p className="text-base text-ink-muted">No pudimos cargar tu pedido.</p>
        <Button variant="secondary" onClick={() => void order.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const data = order.data;
  if (data.status === 'PAGADO') {
    return (
      <div className="flex flex-col gap-6">
        <div role="status" className="flex flex-col gap-1">
          <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">Recibimos tu pago</h2>
          <p className="text-base text-ink-muted">Guarda estos códigos: los necesitarás para recibir tu pedido.</p>
        </div>
        <OrderCodes order={data} />
        <Link to="/menu" className={linkClass}>
          Seguir viendo la carta
        </Link>
      </div>
    );
  }

  // The order stays pending after a rejected attempt (the customer may retry at the provider), so the last payment counts too
  const lastAttemptFailed =
    data.paymentStatus !== null && data.paymentStatus !== 'in_process' && data.paymentStatus !== 'pending';
  if (data.status === 'CANCELADO' || lastAttemptFailed) {
    return (
      <Message title="El pago no se completó" text="No se cobró nada. Puedes intentarlo de nuevo desde tu carrito.">
        <Link to="/cart" className={linkClass}>
          Volver al carrito
        </Link>
      </Message>
    );
  }
  if (waitedTooLong) {
    return (
      <Message title="Tu pago sigue en proceso" text="Te avisaremos cuando se confirme. No hace falta que pagues otra vez.">
        <Link to="/menu" className={linkClass}>
          Ver la carta
        </Link>
      </Message>
    );
  }
  return <Message title="Estamos confirmando tu pago" text="Esto toma unos segundos. No cierres esta página." busy />;
}

function Message({
  title,
  text,
  busy,
  children,
}: {
  title: string;
  text?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div role="status" aria-busy={busy} className="flex flex-col items-start gap-3">
      <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">{title}</h2>
      {text ? <p className="text-base text-ink-muted">{text}</p> : null}
      {children}
    </div>
  );
}
