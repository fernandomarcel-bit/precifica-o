import { describe, expect, it } from 'vitest';
import { num } from './format';

describe('num (entrada em padrão brasileiro)', () => {
  it.each([
    ['', 0], ['12', 12], ['12,5', 12.5], ['12.5', 12.5], ['1.500', 1500], ['1.500,50', 1500.5], ['0,99', 0.99], ['1.250.000', 1250000], [' 7 ', 7],
  ])('%s → %s', (entrada, esperado) => expect(num(entrada)).toBeCloseTo(esperado as number, 6));
  it.each(['abc', '1,2,3', '--5', '.'])('%s → NaN', (e) => expect(Number.isNaN(num(e))).toBe(true));
});
