export function formatPrice(value: number): string {
  return `S/ ${value.toFixed(2)}`;
}

const dateTimeFormat = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hourCycle: 'h23',
  timeZone: 'America/Lima',
});

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}
