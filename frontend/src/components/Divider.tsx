export function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={children}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span aria-hidden="true" className="text-sm text-ink-muted">
        {children}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
