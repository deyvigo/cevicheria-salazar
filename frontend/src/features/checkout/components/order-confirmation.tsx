import { Link } from 'react-router-dom';
import type { Order } from '@/features/checkout/checkout-api';
import { OrderCodes } from '@/features/checkout/components/order-codes';
import { OrderInfoList } from '@/features/checkout/components/order-info-list';
import { OrderSummaryTable } from '@/features/checkout/components/order-summary-table';

const linkClass =
  'text-base font-bold text-ink underline focus-visible:shadow-focus focus-visible:outline-none';

export function OrderConfirmation({ order, email }: { order: Order; email: string | null }) {
  const title = order.status === 'PAGADO' ? 'Recibimos tu pago' : 'Recibimos tu pedido';

  return (
    <div className="flex flex-col gap-6">
      <div role="status" className="flex flex-col gap-1">
        <h2 className="font-display text-[24px] leading-8 font-semibold text-ink">{title}</h2>
        <p className="text-base text-ink-muted">Guarda estos códigos: los necesitarás para recibir tu pedido.</p>
        {email ? <p className="text-base text-ink-muted">Enviamos la confirmación a {email}.</p> : null}
      </div>
      <OrderCodes order={order} />
      <OrderInfoList order={order} />
      <OrderSummaryTable order={order} />
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link to="/perfil/mis-pedidos" className={linkClass}>
          Ver mis pedidos
        </Link>
        <Link to="/menu" className={linkClass}>
          Seguir viendo la carta
        </Link>
      </div>
    </div>
  );
}
