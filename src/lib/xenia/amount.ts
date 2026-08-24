/**
 * Decimal amounts.
 *
 * Everything on the wire is an integer in the token's smallest unit. Floats never touch a balance —
 * `0.1 + 0.2` is the wrong number, and here the wrong number is somebody's money.
 */

/** "1.5" at 18 decimals → 1500000000000000000n. Throws on anything that isn't a plain decimal. */
export function parseAmount(input: string, decimals: number): bigint {
  const trimmed = input.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    throw new Error('Not a number');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places — the token has ${decimals}`);
  }
  return BigInt((whole || '0') + fraction.padEnd(decimals, '0'));
}

/** The inverse, without trailing zeroes. */
export function formatAmount(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export const toHex = (value: bigint): string => `0x${value.toString(16)}`;
