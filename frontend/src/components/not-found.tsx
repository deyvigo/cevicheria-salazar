export function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="font-display text-ink text-[32px] leading-[40px] font-semibold">Página no encontrada</h1>
      <p className="text-base text-ink-muted">La dirección que buscas no existe.</p>
    </main>
  );
}
