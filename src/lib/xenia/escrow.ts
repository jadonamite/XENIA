/**
 * Reads against `XeniaEscrow`.
 *
 * Public reads, over a plain RPC provider rather than the wallet — the claim page has to show what
 * a link is worth before anyone connects anything.
 */

import { CallData, RpcProvider } from 'starknet';
import { ESCROW_ADDRESS, MAINNET } from './config';

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
  cached ??= new RpcProvider({ nodeUrl: MAINNET.rpcUrl });
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
