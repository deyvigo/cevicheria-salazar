import type { CSSProperties } from 'react';

const NAMES = {
  image: 'product-image',
  name: 'product-name',
  price: 'product-price',
  cta: 'product-cta',
  buy: 'product-buy',
  stepper: 'product-stepper',
} as const;

export function sharedName(part: keyof typeof NAMES, active: boolean): CSSProperties | undefined {
  return active ? { viewTransitionName: NAMES[part] } : undefined;
}
