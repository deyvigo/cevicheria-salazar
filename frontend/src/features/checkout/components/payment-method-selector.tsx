import { Card } from '@/components/card';
import type { DeliveryType, PaymentMethod } from '@/features/checkout/checkout-store';

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  deliveryType: DeliveryType;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, deliveryType, onChange }: PaymentMethodSelectorProps) {
  const options: ReadonlyArray<{ id: PaymentMethod; title: string; description: string }> = [
    { id: 'online', title: 'Pago en línea', description: 'Paga con tarjeta u otros medios desde Mercado Pago' },
    {
      id: 'cash_on_delivery',
      title: 'Contraentrega',
      description: deliveryType === 'delivery' ? 'Paga al recibir tu pedido' : 'Paga al recoger tu pedido en tienda',
    },
  ];

  return (
    <div role="radiogroup" aria-label="Método de pago" className="flex flex-col gap-3">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Card
            key={option.id}
            role="radio"
            aria-checked={selected}
            aria-label={option.title}
            tabIndex={0}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChange(option.id);
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
  );
}
