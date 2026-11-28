export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-display text-ink text-title-lg">Página no encontrada</h1>
      <p className="text-body text-ink-muted">La dirección que buscas no existe.</p>
    </main>
  );
}
