import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { PencilIcon } from '@/components/icons/pencil-icon';
import { TrashIcon } from '@/components/icons/trash-icon';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { zoneColorVariable } from '@/features/admin/zone-colors';
import { formatPrice } from '@/features/catalogo/format';

interface ZoneCardProps {
  zone: DeliveryZone;
  hovered: boolean;
  selected: boolean;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
}

export function ZoneCard({ zone, hovered, selected, onHover, onSelect, onEdit, onDelete }: ZoneCardProps) {
  const state = selected
    ? 'border-celeste-700 bg-surface-celeste'
    : hovered
      ? 'border-celeste-300 bg-surface-celeste shadow-md'
      : '';

  return (
    <Card
      data-zone-id={zone.id}
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center gap-3 transition-colors motion-reduce:transition-none ${state}`}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(zone.id)}
        onFocus={() => onHover(zone.id)}
        onBlur={() => onHover(null)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:shadow-focus focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="h-8 w-8 flex-none rounded-full border border-border"
          style={{ backgroundColor: `var(${zoneColorVariable(zone.color)})` }}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base font-bold text-ink">{zone.name}</span>
          <span className="text-sm text-ink-muted">{formatPrice(zone.price)}</span>
          {zone.active ? null : <span className="text-sm font-bold text-ink-subtle">Inactiva</span>}
        </span>
      </button>
      <Button variant="outline" className="h-10 w-10 flex-none px-0!" aria-label={`Editar ${zone.name}`} onClick={() => onEdit(zone)}>
        <PencilIcon />
      </Button>
      <Button variant="outline" className="h-10 w-10 flex-none px-0!" aria-label={`Eliminar ${zone.name}`} onClick={() => onDelete(zone)}>
        <TrashIcon />
      </Button>
    </Card>
  );
}
