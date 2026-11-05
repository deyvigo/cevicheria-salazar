import { describe, expect, it } from 'vitest';
import { computeChange, parseCashAmount, validateCashAmount } from '@/features/checkout/cash-amount';

describe('validateCashAmount', () => {
  it('vacío es válido porque el monto es opcional', () => {
    expect(validateCashAmount('', 85)).toBeNull();
    expect(validateCashAmount('   ', 85)).toBeNull();
  });

  it('rechaza lo que no es un número', () => {
    expect(validateCashAmount('abc', 85)).toMatch(/monto válido/);
    expect(validateCashAmount('-5', 85)).toMatch(/monto válido/);
    expect(validateCashAmount('1e3', 85)).toMatch(/monto válido/);
  });

  it('rechaza cero y más de dos decimales', () => {
    expect(validateCashAmount('0', 85)).toBe('El monto debe ser mayor a cero.');
    expect(validateCashAmount('100.123', 85)).toBe('El monto no puede tener más de dos decimales.');
  });

  it('rechaza montos menores al total y acepta el exacto o mayores', () => {
    expect(validateCashAmount('84.99', 85)).toBe('El monto debe ser al menos S/ 85.00');
    expect(validateCashAmount('85', 85)).toBeNull();
    expect(validateCashAmount('100', 85)).toBeNull();
  });

  it('rechaza montos absurdos y acepta coma decimal', () => {
    expect(validateCashAmount('10000.01', 85)).toBe('El monto es demasiado alto.');
    expect(validateCashAmount('100,50', 85)).toBeNull();
  });

  it('sin total conocido solo valida el formato', () => {
    expect(validateCashAmount('5', null)).toBeNull();
  });
});

describe('parseCashAmount y computeChange', () => {
  it('convierte el texto en soles y devuelve null si no es válido', () => {
    expect(parseCashAmount('100')).toBe(100);
    expect(parseCashAmount('100,5')).toBe(100.5);
    expect(parseCashAmount('x')).toBeNull();
  });

  it('calcula el vuelto sin errores de coma flotante', () => {
    expect(computeChange(100, 85)).toBe(15);
    expect(computeChange(0.3, 0.1 + 0.2)).toBe(0);
    expect(computeChange(85, 85)).toBe(0);
  });
});
