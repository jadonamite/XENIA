/**
 * Finding the wallet objects an extension injects onto `window`.
 *
 * Separated from `wallet.ts` so it can be tested without a browser, because getting it wrong is
 * silent and total: the page reports "no wallet detected" to someone who has several installed,
 * and nothing in the console explains why.
 *
 * The trap is that `Object.keys` returns only **enumerable** properties. Extensions routinely
 * install themselves with `Object.defineProperty(window, key, { enumerable: false })`, so
 * enumerating finds nothing while `window.starknet_argentX` is sitting right there.
 * `getOwnPropertyNames` sees both kinds.
 */

/**
 * Keys a wallet might inject under, checked directly in case one hides behind a prototype or a
 * proxy where even `getOwnPropertyNames` misses it.
 *
 * Not exhaustive by design — the property scan covers anything not listed. This only has to catch
 * wallets that are both hidden *and* unusually named.
 */
export const KNOWN_INJECTION_KEYS = [
  'starknet',
  'starknet_argentX',
  'starknet_ready',
  'starknet_braavos',
  'starknet_okxwallet',
  'starknet_keplr',
  'starknet_metamask',
  'starknet_fordefi',
] as const;

/**
 * Every `starknet*` key present on `target`, enumerable or not.
 *
 * Reads are guarded individually: a property backed by a getter that throws should cost us that one
 * wallet, not the whole scan.
 */
export function starknetInjectionKeys(target: object): string[] {
  const keys = new Set<string>();

  try {
    for (const key of Object.getOwnPropertyNames(target)) {
      if (key.startsWith('starknet')) keys.add(key);
    }
  } catch {
    // Some embedded contexts restrict this. The known keys below still apply.
  }

  for (const key of KNOWN_INJECTION_KEYS) {
    try {
      if ((target as Record<string, unknown>)[key]) keys.add(key);
    } catch {
      // ignore a throwing getter
    }
  }

  return [...keys];
}

/** Reads a key without letting a throwing getter take the scan down with it. */
export function readInjected(target: object, key: string): unknown {
  try {
    return (target as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}
