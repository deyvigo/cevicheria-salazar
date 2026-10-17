import { Button } from '@/components/button';
import { Card } from '@/components/card';
import type { Address } from '@/features/perfil/address-api';

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  leaving?: boolean;
}

export function AddressCard({ address, onEdit, onDelete, leaving = false }: AddressCardProps) {
  return (
    <Card
      className={`flex flex-wrap items-start justify-between gap-4 transition-opacity duration-250 ease-out ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div className="min-w-0">
        <h2 className="font-display text-ink text-[22px] leading-7 font-semibold break-words">{address.label}</h2>
        <p className="text-base text-ink break-words">{address.address}</p>
        {address.reference ? <p className="text-base text-ink-muted break-words">{address.reference}</p> : null}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} aria-label={`Editar ${address.label}`}>
          Editar
        </Button>
        <Button variant="outline" onClick={onDelete} aria-label={`Eliminar ${address.label}`}>
          Eliminar
        </Button>
      </div>
    </Card>
  );
}
