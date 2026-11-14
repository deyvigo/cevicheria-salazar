import { DELIVERY_STATUS_STEPS as STEPS } from '@/features/perfil/delivery-status';
import type { DeliveryStatus } from '@/features/perfil/order-api';

export function DeliveryProgress({ status }: { status: DeliveryStatus }) {
  const current = Math.max(
    STEPS.findIndex((step) => step.status === status),
    0,
  );

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-center text-sm font-bold text-ink">{STEPS[current].label}</p>
      <div aria-hidden="true" className="flex items-center">
        {STEPS.map((step, index) => (
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
