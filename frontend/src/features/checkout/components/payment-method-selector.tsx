import type { ReactNode } from 'react';
import { Card } from '@/components/card';
import { CashIcon } from '@/components/icons/cash-icon';
import { MercadoPagoIcon } from '@/components/icons/mercado-pago-icon';
import type { DeliveryType, PaymentMethod } from '@/features/checkout/checkout-store';

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  deliveryType: DeliveryType;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ value, deliveryType, onChange }: PaymentMethodSelectorProps) {
  const options: ReadonlyArray<{ id: PaymentMethod; title: string; description: string; icon: ReactNode }> = [
    {
      id: 'online',
      title: 'Mercado Pago',
      description: 'Paga en línea con tarjeta u otros medios',
      icon: (
        <span className="flex size-12 items-center justify-center rounded-md bg-celeste-100 text-celeste-800">
          <MercadoPagoIcon className="size-8" />
        </span>
      ),
    },
    {
      id: 'cash_on_delivery',
      title: 'Contraentrega',
      icon: (
        <span className="flex size-12 items-center justify-center rounded-md bg-lima-100 text-lima-800">
          <CashIcon className="size-7" />
        </span>
      ),
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
            className={`flex cursor-pointer items-center gap-4 focus-visible:shadow-focus focus-visible:outline-none ${
              selected ? 'border-action ring-2 ring-action' : 'hover:border-ink/60'
            }`}
          >
            {option.icon}
            <div className="flex min-w-0 flex-col">
              <p className="font-display text-ink text-title-sm">{option.title}</p>
              <p className="text-body text-ink-muted">{option.description}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
