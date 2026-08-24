'use client';

/**
 * The sender's record of the links they created.
 *
 * Held in this browser only. There is no server in the claim path, so there is nowhere else it
 * could live without giving the link away to a host — and a link the host can read is a link the
 * host can spend.
 *
 * The trade is stated in the UI: clear the browser and you lose the link, and with it the ability
 * to re-send it. The money is not lost, because expiry and refund are on-chain and keyed to the
 * sender's address rather than to anything stored here.
 */

const KEY = 'xenia.claims.v1';

export interface StoredClaim {
  commitment: string;
  /** The link public key, which is what the contract is keyed by. */
  pk: string;
  /** The link private key. Whoever reads this can claim. */
  sk: string;
  tokenSymbol: string;
  tokenAddress: string;
  /** Smallest unit, as a decimal string — `bigint` does not survive JSON. */
  amount: string;
  /** Absolute unix seconds. */
  expiry: number;
  createdAt: number;
  txHash: string;
}

const isBrowser = () => typeof window !== 'undefined';

export function loadClaims(): StoredClaim[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredClaim[]) : [];
  } catch {
    return [];
  }
}

export function saveClaim(claim: StoredClaim): void {
  if (!isBrowser()) return;
  const next = [claim, ...loadClaims().filter((c) => c.commitment !== claim.commitment)];
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function forgetClaim(commitment: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify(loadClaims().filter((c) => c.commitment !== commitment)),
  );
}
