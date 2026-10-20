import { lazy, Suspense, useState } from 'react';
import { Button } from '@/components/button';
import { Notification } from '@/components/notification';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { DeleteZoneDialog } from '@/features/admin/components/delete-zone-dialog';
import type { FocusRequest } from '@/features/admin/components/zone-map';
import { ZoneForm } from '@/features/admin/components/zone-form';
import { ZoneList, type ScrollRequest } from '@/features/admin/components/zone-list';
import { useAdminDeliveryZones } from '@/features/admin/use-admin-delivery-zones';
import { DEFAULT_ZONE_COLOR, type ZoneColorId } from '@/features/admin/zone-colors';
import type { ZonePoint } from '@/features/admin/zone-geometry';
import { MapErrorBoundary } from '@/features/perfil/components/map-error-boundary';

const ZoneMap = lazy(() => import('@/features/admin/components/zone-map').then((module) => ({ default: module.ZoneMap })));

export function AdminDeliveryZonesPage() {
  const { data: zones, isPending, isError, refetch } = useAdminDeliveryZones();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  // The draft lives here because the map draws it while the form edits the other fields
  const [draft, setDraft] = useState<{ zone?: DeliveryZone; points: ZonePoint[]; color: ZoneColorId } | null>(null);
  const [deleting, setDeleting] = useState<DeliveryZone | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);

  function selectFromCard(id: number) {
    setSelectedId(id);
    setFocusRequest((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
  }

  function selectFromMap(id: number | null) {
    setSelectedId(id);
    if (id !== null) setScrollRequest((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
  }

  function openForm(zone?: DeliveryZone) {
    setHoveredId(null);
    setDraft({ zone, points: zone?.coordinates ?? [], color: zone?.color ?? DEFAULT_ZONE_COLOR });
    if (zone) {
      setSelectedId(zone.id);
      setFocusRequest((current) => ({ id: zone.id, nonce: (current?.nonce ?? 0) + 1 }));
    } else {
      setSelectedId(null);
    }
  }

  function saved(message: string, zoneId: number) {
    setDraft(null);
    setNotice(message);
    selectFromCard(zoneId);
    setScrollRequest((current) => ({ id: zoneId, nonce: (current?.nonce ?? 0) + 1 }));
  }

  function removed(zone: DeliveryZone) {
    setDeleting(null);
    setNotice('Zona eliminada');
    setHoveredId(null);
    if (selectedId === zone.id) setSelectedId(null);
  }

  const mapFallback = (
    <div role="alert" className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface-celeste p-4 text-center">
      <p className="text-sm font-bold text-error-text">No pudimos cargar el mapa. Revisa tu conexión e intenta de nuevo.</p>
      <Button
        variant="outline"
        onClick={() => {
          setMapFailed(false);
          setMapAttempt((attempt) => attempt + 1);
        }}
      >
        Reintentar
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Zonas de delivery</h1>
        {zones ? (
          <Button onClick={() => openForm()} disabled={draft !== null}>
            Agregar zona
          </Button>
        ) : null}
      </div>

      {isPending ? <p className="text-base text-ink-muted">Cargando las zonas...</p> : null}

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-base font-bold text-error-text">No pudimos cargar las zonas.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {zones ? (
        <div className="grid gap-4 lg:h-[calc(100svh-11rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-[50svh] lg:h-full">
            {mapFailed ? (
              mapFallback
            ) : (
              <MapErrorBoundary key={mapAttempt} fallback={mapFallback} onError={() => setMapFailed(true)}>
                <Suspense fallback={<div className="h-full w-full animate-pulse rounded-lg bg-surface-celeste" />}>
                  <ZoneMap
                    zones={zones}
                    hoveredId={hoveredId}
                    selectedId={selectedId}
                    focusRequest={focusRequest}
                    drawing={draft ? { points: draft.points, color: draft.color, editingId: draft.zone?.id ?? null } : null}
                    onDrawingChange={(points) => setDraft((current) => (current ? { ...current, points } : current))}
                    onHover={setHoveredId}
                    onSelect={selectFromMap}
                    onTilesFailed={() => setMapFailed(true)}
                  />
                </Suspense>
              </MapErrorBoundary>
            )}
          </div>
          {draft ? (
            <ZoneForm
              key={draft.zone?.id ?? 'new'}
              zone={draft.zone}
              points={draft.points}
              color={draft.color}
              mapFailed={mapFailed}
              onPointsChange={(points) => setDraft({ ...draft, points })}
              onColorChange={(color) => setDraft({ ...draft, color })}
              onCancel={() => setDraft(null)}
              onSaved={saved}
            />
          ) : zones.length === 0 ? (
            <p className="text-base text-ink-muted">Aún no tienes zonas de delivery</p>
          ) : (
            <ZoneList
              zones={zones}
              hoveredId={hoveredId}
              selectedId={selectedId}
              scrollRequest={scrollRequest}
              onHover={setHoveredId}
              onSelect={selectFromCard}
              onEdit={openForm}
              onDelete={setDeleting}
            />
          )}
        </div>
      ) : null}

      <DeleteZoneDialog zone={deleting} onClose={() => setDeleting(null)} onDeleted={removed} />

      {notice ? (
        <div className="fixed right-6 bottom-6 z-50">
          <Notification variant="success" title={notice} onClose={() => setNotice(null)} />
        </div>
      ) : null}
    </div>
  );
}
