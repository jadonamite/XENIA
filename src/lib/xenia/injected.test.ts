import { describe, expect, it } from 'vitest';
import { readInjected, starknetInjectionKeys } from './injected';

/**
 * This bug has shipped twice: once in a diagnostic page and once in the wallet picker. Both times
 * it looked identical from the outside — "no wallet detected" on a browser with several installed,
 * and nothing in the console to say why. Both times the cause was `Object.keys`.
 */
describe('finding injected wallets', () => {
  it('finds a wallet installed as a NON-ENUMERABLE property', () => {
    const target = {};
    Object.defineProperty(target, 'starknet_argentX', { value: { id: 'argentX' }, enumerable: false });

    expect(Object.keys(target)).not.toContain('starknet_argentX'); // the trap
    expect(starknetInjectionKeys(target)).toContain('starknet_argentX'); // what we do instead
  });

  it('finds ordinary enumerable ones too', () => {
    const target = { starknet_braavos: { id: 'braavos' }, unrelated: 1 };
    const keys = starknetInjectionKeys(target);
    expect(keys).toContain('starknet_braavos');
    expect(keys).not.toContain('unrelated');
  });

  it('finds several at once, without duplicates', () => {
    const target: Record<string, unknown> = { starknet_braavos: { id: 'braavos' } };
    Object.defineProperty(target, 'starknet_argentX', { value: { id: 'argentX' }, enumerable: false });
    Object.defineProperty(target, 'starknet', { value: { id: 'argentX' }, enumerable: false });

    const keys = starknetInjectionKeys(target);
    expect(keys).toEqual(expect.arrayContaining(['starknet', 'starknet_argentX', 'starknet_braavos']));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('survives a property whose getter throws', () => {
    const target = { starknet_braavos: { id: 'braavos' } };
    Object.defineProperty(target, 'starknet_hostile', {
      get() {
        throw new Error('nope');
      },
      enumerable: false,
    });

    // One hostile wallet must not cost us the rest of the scan.
    expect(() => starknetInjectionKeys(target)).not.toThrow();
    expect(starknetInjectionKeys(target)).toContain('starknet_braavos');
    expect(readInjected(target, 'starknet_hostile')).toBeUndefined();
  });

  it('reports nothing when there is genuinely nothing', () => {
    expect(starknetInjectionKeys({ ethereum: {}, solana: {} })).toEqual([]);
  });
});
