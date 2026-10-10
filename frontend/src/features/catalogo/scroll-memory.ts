let saved: { key: string; y: number } | null = null;

export function rememberScroll(key: string, y: number) {
  saved = { key, y };
}

export function hasSavedScroll(key: string) {
  return saved?.key === key;
}

// One-shot: whatever the outcome, a later visit to the list must not reuse a stale position
export function takeScroll(key: string): number | null {
  const entry = saved;
  saved = null;
  return entry?.key === key ? entry.y : null;
}
