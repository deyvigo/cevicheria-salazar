import type { DeliveryType } from '@/features/checkout/checkout-store';

const OPTIONS: ReadonlyArray<{ id: DeliveryType; label: string }> = [
  { id: 'delivery', label: 'Entrega' },
  { id: 'pickup', label: 'Recojo en tienda' },
];

interface DeliveryTypeSelectorProps {
  value: DeliveryType;
  onChange: (type: DeliveryType) => void;
}

export function DeliveryTypeSelector({ value, onChange }: DeliveryTypeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Tipo de entrega" className="grid grid-cols-2 gap-3">
      {OPTIONS.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={`min-h-12 rounded-lg border px-4 text-base font-bold focus-visible:shadow-focus focus-visible:outline-none ${
              selected ? 'border-action bg-action text-on-action' : 'border-border bg-surface text-ink hover:border-ink/60'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
