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

/**
 * Whether a submission error means "it failed" or only "we stopped waiting".
 *
 * A STRK20 transaction is proved and relayed before it lands, which takes long enough that the
 * wallet request can time out while the transaction goes on to succeed. Reporting that as a
 * failure is worse than reporting nothing: the money moved and the screen said it did not.
 *
 * A rejection names a reason — the user declined, the pool refused, a balance was short. A timeout
 * names nothing, and the chain is the only thing that knows.
 */
/**
 * What to tell someone whose transaction we recovered from an inconclusive submission.
 *
 * Ready gives up on its own request while the transaction goes on to be proved, relayed and
 * mined — that is what `isInconclusive` is for. But the extension also leaves its approval dialog
 * open, so the sender is shown a finished, successful action by us and a live "accept or decline"
 * by the wallet at the same moment, and the safe-looking button is the wrong one.
 *
 * Approving it again submits the whole thing a second time, at a second 6 STRK pool fee. We cannot
 * close another extension's window, so the least we can do is say which way is safe.
 */
export const STALE_PROMPT =
  'Your wallet may still be showing an approval prompt for this transaction. It has already gone ' +
  'through - dismiss or decline that prompt. Approving it a second time would send the ' +
  'transaction again and pay the pool fee twice.';

/**
 * How long to wait on a wallet before asking the chain instead.
 *
 * Generous on purpose: the clock starts when we ask, so it has to cover the person reading the
 * prompt and the pool's own proving, not just the network.
 */
export const WALLET_DEADLINE_MS = 90_000;

/**
 * Rejects if `work` has not settled within `ms`, with a message `isInconclusive` recognises.
 *
 * A wallet request can simply never settle. Ready does this routinely: the transaction is proved,
 * relayed and mined while the extension's own dialog stays open waiting for an approval it has
 * already been given. Awaiting that promise waits forever — the spinner never stops, and on the
 * create path the link is never saved, stranding money the sender has already spent.
 *
 * A deadline converts that hang into the inconclusive case every caller already handles: stop
 * asking the wallet and ask the chain. Firing early is safe, because the recovery only reads —
 * nothing downstream re-submits, so a slow approval costs a chain lookup and nothing else.
 */
export function withDeadline<T>(work: Promise<T>, ms: number = WALLET_DEADLINE_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('The wallet did not answer in time (timeout).')), ms);
  });
  return Promise.race([work, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

export function isInconclusive(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|took too long|no response|deadline|aborted/i.test(message);
}

/**
 * Polls the escrow until `predicate` holds, or gives up.
 *
 * Used after an inconclusive submission to ask the contract what actually happened, rather than
 * guessing from the error. The contract's state is the truth; the wallet's answer is only a report
 * about it.
 */
export async function waitForClaim(
  commitment: string,
  predicate: (entry: ClaimEntry | null) => boolean,
  { attempts = 20, intervalMs = 3000 }: { attempts?: number; intervalMs?: number } = {},
): Promise<ClaimEntry | null | undefined> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const entry = await readClaim(commitment);
      if (predicate(entry)) return entry;
    } catch {
      // A read failing is not an answer either — keep waiting.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return undefined; // still unknown
}

/**
 * Whether an account can receive privately, read straight from the pool.
 *
 * The wallet knows this too, but asking it costs a consent prompt — `wallet_strk20Balances` makes
 * Ready ask to share shielded assets — which is why the connect probe cannot run on a silent
 * session restore. The consequence was that reloading the claim page lost the answer and hid the
 * public payout until the visitor disconnected and reconnected.
 *
 * The pool stores every registered account's viewing key publicly, so this is an ordinary read:
 * no wallet, no prompt, no permission, and authoritative. A zero key means never registered.
 */
export async function isRegistered(address: string): Promise<boolean> {
  const result = await provider().callContract({
    contractAddress: CHAIN.poolAddress,
    entrypoint: 'get_public_key',
    calldata: CallData.compile([address]),
  });
  return BigInt(result[0] ?? '0x0') !== 0n;
}
