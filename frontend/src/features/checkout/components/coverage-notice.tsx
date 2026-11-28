export function CoverageNotice() {
  return (
    <div role="alert" className="rounded-lg border border-border bg-surface-celeste p-4">
      <p className="text-body font-bold text-error-text">Tu dirección no está en cobertura</p>
      <p className="text-body text-ink">Elige otra dirección o cambia a recojo en tienda.</p>
    </div>
  );
}
