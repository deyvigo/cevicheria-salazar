import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Marker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import { zoneColorValue } from '@/features/admin/zone-colors';
import { toLatLngs, type ZonePoint } from '@/features/admin/zone-geometry';

interface ZoneDrawingLayerProps {
  points: ZonePoint[];
  color: string;
  onChange: (points: ZonePoint[]) => void;
}

const MIN_POINTS = 3;
const ROUND = 6;

const VERTEX_ICON = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span class="block h-[18px] w-[18px] rounded-full border-2 border-ink bg-surface shadow-md"></span>',
});

const MIDPOINT_ICON = L.divIcon({
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: '<span class="block h-3 w-3 rounded-full border border-ink bg-surface opacity-70"></span>',
});

function toPoint(latlng: L.LatLng): ZonePoint {
  return { latitude: Number(latlng.lat.toFixed(ROUND)), longitude: Number(latlng.lng.toFixed(ROUND)) };
}

function ClickToAdd({ onAdd }: { onAdd: (point: ZonePoint) => void }) {
  useMapEvents({ click: (event) => onAdd(toPoint(event.latlng)) });
  return null;
}

export function ZoneDrawingLayer({ points, color, onChange }: ZoneDrawingLayerProps) {
  const value = zoneColorValue(color);

  function move(index: number, point: ZonePoint) {
    onChange(points.map((current, i) => (i === index ? point : current)));
  }

  function remove(index: number) {
    if (points.length <= MIN_POINTS) return;
    onChange(points.filter((_, i) => i !== index));
  }

  function insertAfter(index: number, point: ZonePoint) {
    onChange([...points.slice(0, index + 1), point, ...points.slice(index + 1)]);
  }

  return (
    <>
      {points.length >= MIN_POINTS ? (
        <Polygon
          positions={toLatLngs(points)}
          interactive={false}
          pathOptions={{ color: value, fillColor: value, weight: 3, fillOpacity: 0.3 }}
        />
      ) : points.length === 2 ? (
        <Polyline positions={toLatLngs(points)} interactive={false} pathOptions={{ color: value, weight: 3 }} />
      ) : null}
      {points.length >= MIN_POINTS
        ? points.map((point, index) => {
            const next = points[(index + 1) % points.length];
            const middle = { latitude: (point.latitude + next.latitude) / 2, longitude: (point.longitude + next.longitude) / 2 };
            return (
              <Marker
                key={`mid-${index}-${points.length}`}
                position={[middle.latitude, middle.longitude]}
                icon={MIDPOINT_ICON}
                eventHandlers={{ click: () => insertAfter(index, toPoint(L.latLng(middle.latitude, middle.longitude))) }}
              />
            );
          })
        : null}
      {points.map((point, index) => (
        <Marker
          key={`vertex-${index}-${points.length}`}
          position={[point.latitude, point.longitude]}
          icon={VERTEX_ICON}
          draggable
          eventHandlers={{
            dragend: (event) => move(index, toPoint((event.target as L.Marker).getLatLng())),
            click: () => remove(index),
          }}
        />
      ))}
      <ClickToAdd onAdd={(point) => onChange([...points, point])} />
    </>
  );
}
