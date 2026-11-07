import { IconButton } from '@/components/icon-button';
import { Card } from '@/components/card';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
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
        <h2 className="font-display text-ink text-lg leading-6 font-semibold break-words">{address.label}</h2>
        <p className="text-sm text-ink break-words">{address.address}</p>
        {address.reference ? <p className="text-sm text-ink-muted break-words">{address.reference}</p> : null}
      </div>
      <div className="flex gap-3">
        <IconButton
          onClick={onEdit}
          aria-label={`Editar ${address.label}`}
        >
          <PencilIcon />
        </IconButton>
        <IconButton
          onClick={onDelete}
          aria-label={`Eliminar ${address.label}`}
        >
          <TrashIcon />
        </IconButton>
      </div>
    </Card>
  );
}
