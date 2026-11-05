export const MAX_CASH_AMOUNT = 10000;

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

function normalize(text: string): string {
  return text.trim().replace(',', '.');
}

// Money is compared in cents so 0.1 + 0.2 style errors can't flip a validation
function toCents(value: number): number {
  return Math.round(value * 100);
}

export function parseCashAmount(text: string): number | null {
  const normalized = normalize(text);
  if (!AMOUNT_PATTERN.test(normalized)) return null;
  return toCents(Number(normalized)) / 100;
}

export function validateCashAmount(text: string, total: number | null): string | null {
  const normalized = normalize(text);
  if (normalized === '') return null;
  if (!AMOUNT_PATTERN.test(normalized)) return 'Escribe un monto válido, por ejemplo 100 o 100.50.';
  if ((normalized.split('.')[1] ?? '').length > 2) return 'El monto no puede tener más de dos decimales.';
  const cents = toCents(Number(normalized));
  if (cents <= 0) return 'El monto debe ser mayor a cero.';
  if (cents > toCents(MAX_CASH_AMOUNT)) return 'El monto es demasiado alto.';
  if (total !== null && cents < toCents(total)) return `El monto debe ser al menos S/ ${total.toFixed(2)}`;
  return null;
}

export function computeChange(amount: number, total: number): number {
  return (toCents(amount) - toCents(total)) / 100;
}
