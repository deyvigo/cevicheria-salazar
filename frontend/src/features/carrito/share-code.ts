export interface CartItem {
  productId: number;
  quantity: number;
}

export const MAX_QUANTITY = 99;
export const MAX_PRODUCTS = 100;
const MAX_URL_LENGTH = 2000;

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  } catch {
    return null;
  }
}

export function encodeCart(items: CartItem[]): string {
  const raw = [...items]
    .sort((a, b) => a.productId - b.productId)
    .map((item) => `${item.productId}:${item.quantity}`)
    .join(',');
  return toBase64Url(raw);
}

export type DecodedCart = { ok: true; items: CartItem[] } | { ok: false };

// The code comes from a URL anyone can edit, so every pair is validated and bad ones are dropped one by one
export function decodeCart(code: string): DecodedCart {
  const raw = fromBase64Url(code);
  if (raw === null) return { ok: false };

  const seen = new Set<number>();
  const items: CartItem[] = [];
  for (const pair of raw.split(',')) {
    const match = /^(\d{1,15}):(\d{1,6})$/.exec(pair);
    if (!match) continue;
    const productId = Number(match[1]);
    const quantity = Number(match[2]);
    if (productId < 1 || quantity < 1 || seen.has(productId)) continue;
    seen.add(productId);
    items.push({ productId, quantity: Math.min(quantity, MAX_QUANTITY) });
    if (items.length === MAX_PRODUCTS) break;
  }
  return items.length > 0 ? { ok: true, items } : { ok: false };
}

export function buildShareUrl(items: CartItem[]): string | null {
  const url = `${window.location.origin}/cart?c=${encodeCart(items)}`;
  return url.length > MAX_URL_LENGTH ? null : url;
}
