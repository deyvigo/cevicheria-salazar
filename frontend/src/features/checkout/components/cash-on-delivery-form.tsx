import { useState } from 'react';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { computeChange, parseCashAmount, validateCashAmount } from '@/features/checkout/cash-amount';
import type { CollectionMethod, DeliveryType } from '@/features/checkout/checkout-store';
import { formatPrice } from '@/features/catalogo/format';

interface CashOnDeliveryFormProps {
  deliveryType: DeliveryType;
  method: CollectionMethod | null;
  cashAmount: string;
  total: number | null;
  onMethodChange: (method: CollectionMethod) => void;
  onCashAmountChange: (amount: string) => void;
}

export function CashOnDeliveryForm({
  deliveryType,
  method,
  cashAmount,
  total,
  onMethodChange,
  onCashAmountChange,
}: CashOnDeliveryFormProps) {
  const [touched, setTouched] = useState(false);
  const pickup = deliveryType === 'pickup';
  const options: ReadonlyArray<{ id: CollectionMethod; title: string; description: string }> = [
    {
      id: 'cash',
      title: 'Efectivo',
      description: pickup ? 'Pagas en efectivo al recoger' : 'Pagas en efectivo al repartidor',
    },
    { id: 'yape', title: 'Yape', description: pickup ? 'Pagas con Yape al recoger' : 'Pagas con Yape al repartidor' },
  ];

  const error = validateCashAmount(cashAmount, total);
  const amount = error === null ? parseCashAmount(cashAmount) : null;
  const change = amount !== null && total !== null ? computeChange(amount, total) : null;

  return (
    <section aria-labelledby="cod-title" className="flex flex-col gap-4">
      <h3 id="cod-title" className="font-display text-[20px] leading-7 font-semibold text-ink">
        {pickup ? 'Detalle del pago al recoger' : 'Detalle del pago contraentrega'}
      </h3>
      <div role="radiogroup" aria-label="Cómo pagarás" className="flex flex-col gap-3">
        {options.map((option) => {
          const selected = option.id === method;
          return (
            <Card
              key={option.id}
              role="radio"
              aria-checked={selected}
              aria-label={option.title}
              tabIndex={0}
              onClick={() => onMethodChange(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onMethodChange(option.id);
                }
              }}
              className={`cursor-pointer focus-visible:shadow-focus focus-visible:outline-none ${
                selected ? 'border-action ring-2 ring-action' : 'hover:border-ink/60'
              }`}
            >
              <p className="font-display text-ink text-[18px] leading-6 font-semibold">{option.title}</p>
              <p className="text-base text-ink-muted">{option.description}</p>
            </Card>
          );
        })}
      </div>
      {method === 'cash' ? (
        <div className="flex flex-col gap-2">
          <Input
            name="cash-amount"
            label="¿Con cuánto pagarás? (opcional)"
            inputMode="decimal"
            placeholder="Ej. 100.00"
            autoComplete="off"
            value={cashAmount}
            onChange={(event) => onCashAmountChange(event.target.value)}
            onBlur={() => setTouched(true)}
            error={touched || cashAmount !== '' ? (error ?? undefined) : undefined}
            hint="Si lo dejas vacío, pagas con el monto exacto o el repartidor verá el vuelto."
          />
          {change !== null ? <p className="text-base font-bold text-ink">Vuelto: {formatPrice(change)}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
