import { formatPrice } from '@/features/catalogo/format';
import type { Order } from '@/features/checkout/checkout-api';

export function OrderSummaryTable({ order }: { order: Order }) {
  return (
    <section aria-labelledby="order-detail-title" className="flex flex-col gap-3">
      <h3 id="order-detail-title" className="font-display text-[20px] leading-7 font-semibold text-ink">
        Detalle del pedido
      </h3>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-base text-ink">
          <thead className="text-sm text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-bold">
                Plato
              </th>
              <th scope="col" className="px-4 py-2 text-center font-bold">
                Cant.
              </th>
              <th scope="col" className="px-4 py-2 text-right font-bold">
                Precio
              </th>
              <th scope="col" className="px-4 py-2 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId} className="border-t border-border">
                <td className="px-4 py-2">{item.name}</td>
                <td className="px-4 py-2 text-center">{item.quantity}</td>
                <td className="px-4 py-2 text-right">{formatPrice(item.unitPrice)}</td>
                <td className="px-4 py-2 text-right">{formatPrice(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="flex flex-col gap-1 self-end text-base text-ink sm:min-w-64">
        <Row label="Subtotal" value={formatPrice(order.subtotal)} />
        <Row
          label="Delivery"
          value={order.deliveryType === 'RECOJO' ? 'Recojo en tienda, sin costo' : formatPrice(order.deliveryPrice)}
        />
        <div className="flex justify-between gap-6 border-t border-border pt-2 font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
