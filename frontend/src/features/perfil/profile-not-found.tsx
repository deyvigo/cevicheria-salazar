export function ProfileNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-ink text-title-lg">Página no encontrada</h1>
      <p className="text-body text-ink-muted">La dirección que buscas no existe.</p>
    </div>
  );
}
