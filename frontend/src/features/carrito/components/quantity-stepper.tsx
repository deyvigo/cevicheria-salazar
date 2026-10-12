import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/button';

const MAX_DIGITS = 10;

export function QuantityStepper({
  value,
  min,
  max,
  label,
  disabled = false,
  fullWidth = false,
  style,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  disabled?: boolean;
  // Stretches the field so the whole row width goes to it; the buttons keep their size
  fullWidth?: boolean;
  style?: CSSProperties;
  onChange: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  // The field only applies on confirm, so clearing it to type another number doesn't remove the dish
  function commit() {
    if (draft === '') {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    const wanted = Number.isSafeInteger(parsed) ? parsed : max;
    const next = Math.max(min, Math.min(wanted, max));
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div
      role="group"
      style={style}
      aria-label={`Cantidad de ${label}`}
      className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}
    >
      <Button
        type="button"
        variant="secondary"
        aria-label={`Quitar una unidad de ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className="w-12 flex-none px-0!"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2.5}>
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </Button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Cantidad de ${label}`}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          event.currentTarget.blur();
        }}
        onFocus={(event) => event.currentTarget.select()}
        className={`h-12 min-w-0 rounded-md border border-border-strong px-2 text-center text-base text-ink focus:border-focus-ring focus:ring-2 focus:ring-celeste-200 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-ink-disabled ${fullWidth ? 'flex-1' : 'w-16 flex-none'}`}
      />
      <Button
        type="button"
        variant="secondary"
        aria-label={`Agregar una unidad de ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className="w-12 flex-none px-0!"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth={2.5}>
          <path d="M5 12h14M12 5v14" strokeLinecap="round" />
        </svg>
      </Button>
    </div>
  );
}
