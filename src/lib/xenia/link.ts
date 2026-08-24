/**
 * Claim links.
 *
 * The key travels in the URL fragment. Browsers do not send fragments to servers, so the key never
 * reaches our host, our logs, or any analytics in between — the chain only ever sees its hash.
 */

import { linkKeyFromSecret, type LinkKey } from './crypto';

export const CLAIM_PATH = '/c';

/** Builds the shareable link for a claim. */
export function buildClaimLink(origin: string, sk: string): string {
  return `${origin.replace(/\/$/, '')}${CLAIM_PATH}#${sk.replace(/^0x/, '')}`;
}

/**
 * Reads the key out of a fragment.
 *
 * Returns null rather than throwing: a mistyped or truncated link is an ordinary thing for a
 * recipient to arrive with, and the claim page should say so rather than crash.
 */
export function readClaimFragment(fragment: string): LinkKey | null {
  const raw = fragment.replace(/^#/, '').trim();
  if (!/^(0x)?[0-9a-fA-F]{1,64}$/.test(raw)) return null;
  try {
    const key = linkKeyFromSecret(raw.startsWith('0x') ? raw : `0x${raw}`);
    return BigInt(key.sk) === 0n ? null : key;
  } catch {
    return null;
  }
}

/** Reads the key from the current browser location. Safe to call during SSR. */
export function readClaimFromLocation(): LinkKey | null {
  if (typeof window === 'undefined') return null;
  return readClaimFragment(window.location.hash);
}
