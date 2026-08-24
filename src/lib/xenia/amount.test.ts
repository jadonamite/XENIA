import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './amount';

describe('amounts', () => {
  it('parses to the smallest unit', () => {
    expect(parseAmount('1.5', 18)).toBe(1500000000000000000n);
    expect(parseAmount('0.000001', 6)).toBe(1n);
    expect(parseAmount('12', 6)).toBe(12000000n);
    expect(parseAmount('.5', 2)).toBe(50n);
  });

  it('rejects more precision than the token has', () => {
    // Silently truncating here is how a user sends a different amount from the one they typed.
    expect(() => parseAmount('1.0000001', 6)).toThrow();
  });

  it('rejects anything that is not a plain decimal', () => {
    for (const input of ['', '.', 'abc', '1e18', '-1', '1,5']) {
      expect(() => parseAmount(input, 18)).toThrow();
    }
  });

  it('round-trips', () => {
    for (const [value, decimals] of [
      ['1.5', 18],
      ['0.000001', 6],
      ['1000000', 18],
      ['0', 6],
    ] as const) {
      expect(formatAmount(parseAmount(value, decimals), decimals)).toBe(value);
    }
  });

  it('does not lose precision a float would', () => {
    const units = parseAmount('0.1', 18) + parseAmount('0.2', 18);
    expect(formatAmount(units, 18)).toBe('0.3');
  });
});
