import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { DeliveryZone } from '@/features/admin/admin-delivery-zone-api';
import { ZoneDrawingLayer } from '@/features/admin/components/zone-drawing-layer';
import { zoneColorValue } from '@/features/admin/zone-colors';
import { sortByAreaDescending, toLatLngs, type ZonePoint } from '@/features/admin/zone-geometry';
import { DEFAULT_LOCATION } from '@/features/perfil/default-location';
import { TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-config';

export interface FocusRequest {
  id: number;
  nonce: number;
}

export interface DrawingState {
  points: ZonePoint[];
  color: string;
  // The zone being edited is replaced on the map by its draft
  editingId: number | null;
}

interface ZoneMapProps {
  zones: DeliveryZone[];
  hoveredId: number | null;
  selectedId: number | null;
  focusRequest: FocusRequest | null;
  drawing: DrawingState | null;
  onDrawingChange: (points: ZonePoint[]) => void;
  onHover: (id: number | null) => void;
  onSelect: (id: number | null) => void;
  onTilesFailed: () => void;
}

function pathOptionsFor(zone: DeliveryZone, hovered: boolean, selected: boolean) {
  const color = zoneColorValue(zone.color);
  const fillOpacity = !zone.active ? 0.08 : selected ? 0.5 : hovered ? 0.4 : 0.25;
  return {
    color,
    fillColor: color,
    weight: selected ? 4 : hovered ? 3 : 2,
    fillOpacity,
    dashArray: zone.active ? undefined : '6 6',
    // A click on a polygon must not also reach the map, which clears the selection
    bubblingMouseEvents: false,
  };
}

function ClearOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear });
  return null;
}

function FitAll({ zones }: { zones: DeliveryZone[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || zones.length === 0) return;
    done.current = true;
    map.fitBounds(zones.flatMap((zone) => toLatLngs(zone.coordinates)), { padding: [32, 32], maxZoom: 16 });
  }, [map, zones]);
  return null;
}

// Frames the zone chosen from its card; the zone may not be in the list yet right after saving, so it waits for it
function FitSelected({ zones, focusRequest }: { zones: DeliveryZone[]; focusRequest: FocusRequest | null }) {
  const map = useMap();
  const handled = useRef(0);
  useEffect(() => {
    if (!focusRequest || handled.current === focusRequest.nonce) return;
    const zone = zones.find((candidate) => candidate.id === focusRequest.id);
    if (!zone) return;
    handled.current = focusRequest.nonce;
    map.fitBounds(toLatLngs(zone.coordinates), { padding: [48, 48], maxZoom: 17 });
  }, [map, zones, focusRequest]);
  return null;
}

export function ZoneMap({
  zones,
  hoveredId,
  selectedId,
  focusRequest,
  drawing,
  onDrawingChange,
  onHover,
  onSelect,
  onTilesFailed,
}: ZoneMapProps) {
  const anyTileLoaded = useRef(false);
  const ordered = useMemo(() => sortByAreaDescending(zones), [zones]);

  return (
    <MapContainer
      center={[DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude]}
      zoom={13}
      // Leaflet's defaults zoom in whole levels per step, which feels jumpy when drawing precise polygons
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={120}
      // isolate: Leaflet panes use z-index up to 1000, which would otherwise paint over the dialogs (z-50)
      className="isolate h-full w-full rounded-lg border border-border"
      aria-label="Mapa de zonas de delivery"
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        eventHandlers={{
          tileload: () => {
            anyTileLoaded.current = true;
          },
          tileerror: () => {
            if (!anyTileLoaded.current) onTilesFailed();
          },
        }}
      />
      {ordered
        .filter((zone) => zone.id !== drawing?.editingId)
        .map((zone) =>
          drawing ? (
            // While drawing, the other zones are only a reference: no hover, no click, so every click reaches the map
            <Polygon
              key={`${zone.id}-drawing`}
              positions={toLatLngs(zone.coordinates)}
              interactive={false}
              pathOptions={{ color: zoneColorValue(zone.color), weight: 1, opacity: 0.5, fillOpacity: 0.08 }}
            />
          ) : (
            <Polygon
              key={zone.id}
              positions={toLatLngs(zone.coordinates)}
              pathOptions={pathOptionsFor(zone, zone.id === hoveredId, zone.id === selectedId)}
              eventHandlers={{
                mouseover: () => onHover(zone.id),
                mouseout: () => onHover(null),
                click: () => onSelect(zone.id),
              }}
            />
          ),
        )}
      {drawing ? (
        <ZoneDrawingLayer points={drawing.points} color={drawing.color} onChange={onDrawingChange} />
      ) : (
        <ClearOnMapClick onClear={() => onSelect(null)} />
      )}
      <FitAll zones={zones} />
      <FitSelected zones={zones} focusRequest={focusRequest} />
    </MapContainer>
  );
}
