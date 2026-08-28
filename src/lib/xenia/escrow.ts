/**
 * Reads against `XeniaEscrow`.
 *
 * Public reads, over a plain RPC provider rather than the wallet — the claim page has to show what
 * a link is worth before anyone connects anything.
 */

import { CallData, RpcProvider } from 'starknet';
import { ESCROW_ADDRESS, CHAIN } from './config';
import type { ClaimSignature } from './crypto';

export interface ClaimEntry {
  token: string;
  amount: bigint;
  expiry: number;
  refundTo: string;
  claimed: boolean;
}

export type ClaimStatus = 'unknown' | 'claimable' | 'claimed' | 'expired';

let cached: RpcProvider | null = null;

export function provider(): RpcProvider {
  cached ??= new RpcProvider({ nodeUrl: CHAIN.rpcUrl });
  return cached;
}

/**
 * `ClaimEntry` in declaration order: token, amount (u128, one felt), expiry, refund_to, claimed.
 * Read positionally because the client does not ship the contract ABI — a field added on the Cairo
 * side without updating this is a silently wrong screen, which is why the shape is asserted here.
 */
export async function readClaim(commitment: string): Promise<ClaimEntry | null> {
  if (!ESCROW_ADDRESS) {
    // Returning null here would render as "no such link", which is a lie about a build problem.
    throw new Error('This build has no escrow address configured, so links cannot be looked up.');
  }
  const result = await provider().callContract({
    contractAddress: ESCROW_ADDRESS,
    entrypoint: 'get_claim',
    calldata: CallData.compile([commitment]),
  });
  if (result.length < 5) throw new Error('Unexpected get_claim response');
  const [token, amount, expiry, refundTo, claimed] = result;
  if (BigInt(token) === 0n) return null;
  return {
    token,
    amount: BigInt(amount),
    expiry: Number(BigInt(expiry)),
    refundTo,
    claimed: BigInt(claimed) === 1n,
  };
}

export function statusOf(entry: ClaimEntry | null, now = Date.now() / 1000): ClaimStatus {
  if (!entry) return 'unknown';
  if (entry.claimed) return 'claimed';
  return now >= entry.expiry ? 'expired' : 'claimable';
}

/**
 * The call that pays a claimant in ordinary tokens, outside the pool.
 *
 * An ordinary Starknet invoke, not a STRK20 action — which is exactly why it works for someone who
 * has never registered. The pool is not involved, so there is no viewing key to publish and no
 * pool fee to cover.
 *
 * Permissionless by design: the signature names the destination, so a third party can submit this
 * for a recipient who has no gas without being able to redirect anything.
 */
export function publicClaimCall(pk: string, claimant: string, signature: ClaimSignature) {
  const felt = (value: string) => `0x${BigInt(value).toString(16)}`;
  return {
    contractAddress: ESCROW_ADDRESS,
    entrypoint: 'claim_public',
    calldata: [felt(pk), felt(claimant), felt(signature.r), felt(signature.s)],
  };
}

/**
 * Asks the relayer to submit a public claim, so the recipient needs no gas.
 *
 * Safe to hand to a stranger's server: the signature names the destination, so the relayer can
 * only pay the address it was given, and the contract enforces that. The worst a hostile relayer
 * could do is refuse.
 *
 * Returns null when relaying is unavailable, so the caller can fall back to the recipient
 * submitting it from their own wallet.
 */
export async function relayPublicClaim(
  pk: string,
  claimant: string,
  signature: ClaimSignature,
): Promise<{ transaction_hash: string } | null> {
  const response = await fetch('/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pk, claimant, r: signature.r, s: signature.s }),
  });

  if (response.status === 503) return null; // not configured — caller falls back
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error ?? 'The relayer refused the claim.');
  return body;
}
