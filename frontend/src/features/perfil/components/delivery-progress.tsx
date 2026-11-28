import { milestoneIndex, milestonesFor } from '@/features/perfil/delivery-status';
import type { DeliveryStatus, OrderDeliveryType } from '@/features/perfil/order-api';

interface DeliveryProgressProps {
  status: DeliveryStatus;
  type: OrderDeliveryType;
  size?: 'sm' | 'lg';
}

export function DeliveryProgress({ status, type, size = 'sm' }: DeliveryProgressProps) {
  const steps = milestonesFor(type);
  const current = milestoneIndex(status, type);

  if (size === 'lg') {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-display text-ink text-center text-title-md">{steps[current].label}</p>
        <ol
          aria-label="Progreso del pedido"
          className="grid"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, index) => (
            <li
              key={step.status}
              aria-current={index === current ? 'step' : undefined}
              className="flex flex-col items-center gap-2"
            >
              <div aria-hidden="true" className="flex w-full items-center">
                <span
                  className={`h-1 flex-1 ${index === 0 ? '' : index <= current ? 'bg-action' : 'bg-border-strong'}`}
                />
                <span
                  data-testid="delivery-dot"
                  data-reached={index <= current}
                  className={`h-6 w-6 flex-none rounded-full border-4 ${
                    index <= current ? 'border-action bg-action' : 'border-border-strong bg-surface'
                  }`}
                />
                <span
                  className={`h-1 flex-1 ${
                    index === steps.length - 1 ? '' : index < current ? 'bg-action' : 'bg-border-strong'
                  }`}
                />
              </div>
              <span
                className={`px-1 text-center text-body-sm break-words ${
                  index <= current ? 'font-bold text-ink' : 'text-ink-muted'
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-center text-label text-ink">{steps[current].label}</p>
      <div aria-hidden="true" className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.status} className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
            {index > 0 ? (
              <span className={`h-0.5 flex-1 ${index <= current ? 'bg-action' : 'bg-border-strong'}`} />
            ) : null}
            <span
              data-testid="delivery-dot"
              data-reached={index <= current}
              className={`h-2.5 w-2.5 flex-none rounded-full border-2 ${
                index <= current ? 'border-action bg-action' : 'border-border-strong bg-surface'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
