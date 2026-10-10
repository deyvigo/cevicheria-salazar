export function AvailabilityBadge({ available }: { available: boolean | null }) {
  if (available === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm leading-5 font-bold ${
        available ? 'bg-success-surface text-success-text' : 'bg-error-surface text-error-text'
      }`}
    >
      <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-current" />
      {available ? 'Disponible' : 'Agotado'}
    </span>
  );
}
