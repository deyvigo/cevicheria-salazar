import { ZONE_COLORS, type ZoneColorId } from '@/features/admin/zone-colors';

interface ZoneColorPickerProps {
  value: ZoneColorId;
  onChange: (color: ZoneColorId) => void;
}

export function ZoneColorPicker({ value, onChange }: ZoneColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <p id="zone-color-label" className="text-sm font-bold text-ink">
        Color
      </p>
      <div role="radiogroup" aria-labelledby="zone-color-label" className="flex flex-wrap gap-3">
        {ZONE_COLORS.map((color) => {
          const selected = color.id === value;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              onClick={() => onChange(color.id)}
              className={`h-10 w-10 rounded-full border-2 focus-visible:shadow-focus focus-visible:outline-none ${
                selected ? 'border-ink ring-2 ring-surface ring-inset' : 'border-border'
              }`}
              style={{ backgroundColor: `var(${color.variable})` }}
            />
          );
        })}
      </div>
    </div>
  );
}
