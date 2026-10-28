export type CheckoutStepId = 'cart' | 'login' | 'delivery' | 'payment' | 'done';

export const CHECKOUT_STEPS: ReadonlyArray<{ id: CheckoutStepId; title: string; description: string }> = [
  { id: 'cart', title: 'Carrito de compras', description: 'Revisa tus productos' },
  { id: 'login', title: 'Inicio de sesión', description: 'Ingresa a tu cuenta' },
  { id: 'delivery', title: 'Entrega', description: 'Elige dónde recibir tu pedido' },
  { id: 'payment', title: 'Pago', description: 'Elige cómo vas a pagar' },
  { id: 'done', title: '¡Listo!', description: 'Revisa el detalle de tu pedido' },
];

interface CheckoutStepperProps {
  currentStep: CheckoutStepId;
  isAuthenticated: boolean;
}

export function CheckoutStepper({ currentStep, isAuthenticated }: CheckoutStepperProps) {
  const steps = CHECKOUT_STEPS.filter((step) => !(isAuthenticated && step.id === 'login'));

  return (
    <nav aria-label="Pasos de la compra" className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center gap-2 text-center"
            >
              {index > 0 ? (
                <span aria-hidden="true" className="absolute top-5 right-1/2 left-[-50%] -z-0 h-0.5 bg-border" />
              ) : null}
              <span
                className={`relative z-10 flex size-10 items-center justify-center rounded-full font-display text-base font-semibold ${
                  isCurrent ? 'bg-action text-on-action' : 'bg-surface-disabled text-ink'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-base font-bold text-ink">{step.title}</span>
              <span className="text-sm text-ink-muted">{step.description}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
