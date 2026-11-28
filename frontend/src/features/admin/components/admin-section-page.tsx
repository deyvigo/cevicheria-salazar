export function AdminSectionPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="font-display text-ink text-title-lg">{title}</h1>
      <p className="mt-6 rounded-lg border border-border bg-surface p-8 text-center text-body text-ink-muted">
        Aún no hay nada por mostrar.
      </p>
    </section>
  );
}
