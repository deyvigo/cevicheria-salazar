import { Button } from '@/components/button';
import { Card } from '@/components/card';
import type { Address } from '@/features/perfil/address-api';

interface AddressOptionListProps {
  addresses: Address[] | undefined;
  isPending: boolean;
  isError: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onRetry: () => void;
}

export function AddressOptionList({
  addresses,
  isPending,
  isError,
  selectedId,
  onSelect,
  onAdd,
  onRetry,
}: AddressOptionListProps) {
  if (isPending) {
    return <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-surface-celeste" />;
  }
  if (isError || !addresses) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 py-8">
        <p className="text-base text-ink-muted">No pudimos cargar tus direcciones.</p>
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Direcciones de entrega" className="flex flex-col gap-3">
      {addresses.map((address) => {
        const selected = address.id === selectedId;
        return (
          <Card
            key={address.id}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onSelect(address.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(address.id);
              }
            }}
            className={`cursor-pointer focus-visible:shadow-focus focus-visible:outline-none ${
              selected ? 'border-action ring-2 ring-action' : 'hover:border-ink/60'
            }`}
          >
            <p className="font-display text-ink text-[18px] leading-6 font-semibold break-words">{address.label}</p>
            <p className="text-base text-ink break-words">{address.address}</p>
            {address.reference ? <p className="text-base text-ink-muted break-words">{address.reference}</p> : null}
          </Card>
        );
      })}
      <Button variant="outline" onClick={onAdd}>
        Agregar nueva dirección
      </Button>
    </div>
  );
}
