import { useEffect, useRef } from 'react';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { ZoneCard } from '@/features/admin/components/zone-card';

export interface ScrollRequest {
  id: number;
  nonce: number;
}

interface ZoneListProps {
  zones: DeliveryZone[];
  hoveredId: number | null;
  selectedId: number | null;
  scrollRequest: ScrollRequest | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
  onEdit: (zone: DeliveryZone) => void;
  onDelete: (zone: DeliveryZone) => void;
}

export function ZoneList({ zones, hoveredId, selectedId, scrollRequest, onHover, onSelect, onEdit, onDelete }: ZoneListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scrolls the list itself, not the page, and only when the card is not already fully visible
  useEffect(() => {
    if (!scrollRequest) return;
    const container = containerRef.current;
    const card = container?.querySelector<HTMLElement>(`[data-zone-id="${scrollRequest.id}"]`);
    if (!container || !card) return;
    const box = container.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    if (rect.top >= box.top && rect.bottom <= box.bottom) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      top: container.scrollTop + (rect.top - box.top) - (box.height - rect.height) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [scrollRequest]);

  return (
    <div ref={containerRef} className="flex max-h-[40svh] flex-col gap-3 overflow-y-auto p-1 lg:h-full lg:max-h-none lg:min-h-0">
      {zones.map((zone) => (
        <ZoneCard
          key={zone.id}
          zone={zone}
          hovered={zone.id === hoveredId}
          selected={zone.id === selectedId}
          onHover={onHover}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
