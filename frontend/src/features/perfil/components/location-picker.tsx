import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface Location {
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  value: Location;
  onChange: (location: Location) => void;
  onTilesFailed: () => void;
}

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ZOOM = 16;

// The default Leaflet marker images break once the bundler hashes the asset paths
const MARKER_ICON = L.divIcon({
  className: 'text-action',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  html: '<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" stroke="white" stroke-width="1.5"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5" fill="white" stroke="none"/></svg>',
});

function toPoint(latlng: L.LatLng): Location {
  return { latitude: Number(latlng.lat.toFixed(6)), longitude: Number(latlng.lng.toFixed(6)) };
}

function ClickToMove({ onChange }: { onChange: (location: Location) => void }) {
  useMapEvents({ click: (event) => onChange(toPoint(event.latlng)) });
  return null;
}

function Recenter({ value }: { value: Location }) {
  const map = useMap();
  useEffect(() => {
    map.setView([value.latitude, value.longitude]);
  }, [map, value.latitude, value.longitude]);
  return null;
}

export function LocationPicker({ value, onChange, onTilesFailed }: LocationPickerProps) {
  const anyTileLoaded = useRef(false);
  const markerHandlers = useMemo(
    () => ({ dragend: (event: L.LeafletEvent) => onChange(toPoint((event.target as L.Marker).getLatLng())) }),
    [onChange],
  );

  return (
    <MapContainer
      center={[value.latitude, value.longitude]}
      zoom={ZOOM}
      className="h-64 w-full rounded-lg border border-border"
      aria-label="Mapa para fijar la ubicación de entrega"
    >
      <TileLayer
        url={TILE_URL}
        attribution="&copy; OpenStreetMap contributors"
        eventHandlers={{
          tileload: () => {
            anyTileLoaded.current = true;
          },
          tileerror: () => {
            if (!anyTileLoaded.current) onTilesFailed();
          },
        }}
      />
      <Marker position={[value.latitude, value.longitude]} icon={MARKER_ICON} draggable eventHandlers={markerHandlers} />
      <ClickToMove onChange={onChange} />
      <Recenter value={value} />
    </MapContainer>
  );
}
