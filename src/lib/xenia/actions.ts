/**
 * STRK20 action lists.
 *
 * Pool transactions are batches of actions ordered by phase. A transaction may skip phases but
 * never go backwards, and it may carry at most one external invoke — which is why creating a claim
 * and claiming it are always separate transactions.
 *
 * Calldata order here must match `XeniaEscrow::privacy_invoke` exactly. The pool deserialises it
 * straight into the contract's parameters, so a field out of order is not a type error anywhere —
 * it is a transaction that reverts, or worse, does not.
 *
 * Every operation sends **ten** felts, because the entrypoint takes ten parameters and Starknet
 * deserialises positionally. Unused positions are zero; a short array fails before the contract's
 * own code runs.
 */

import type { STRK20_ACTION } from 'starknet';
import type { ClaimSignature } from './crypto';

/** Mirrors `XeniaOperation` in the contract. Serialised as the enum's variant index. */
export const OPERATION = {
  Deposit: '0x0',
  Claim: '0x1',
  Refund: '0x2',
} as const;

/**
 * `${openNoteIds[0]}` is a wallet-resolved placeholder. The wallet substitutes the id of the first
 * transfer action with amount "OPEN" when it assembles the transaction, so the client never has to
 * know the note id in advance.
 *
 * It stays a literal string: hex-encoding it produces a felt the wallet will not substitute.
 */
export const FIRST_OPEN_NOTE = '${openNoteIds[0]}';

/** Unused calldata positions. */
const NONE = '0x0';

export interface CreateClaimParams {
  escrow: string;
  token: string;
  /** Smallest unit of the token. */
  amount: string;
  commitment: string;
  /** Absolute block timestamp, seconds. */
  expiry: number;
  /** Who may reclaim the funds once the expiry passes. */
  refundTo: string;
  /**
   * Optional pre-funding: an address to send fee token to out of the escrow, and how much.
   *
   * Deposit reuses the `claimant` and `note_id` positions for this rather than appending, because
   * the pool deserialises positionally and appending would break the calldata length. Both were
   * already zero, so omitting this is exactly the old behaviour.
   */
  prefund?: { recipient: string; amount: string };
}

/**
 * Creating a claim: withdraw out of the pool into the escrow, then tell the escrow what it now
 * holds.
 *
 * The withdraw is what settles the pool's balance invariant, which is why the escrow returns an
 * empty span from a deposit — the tokens have already moved and there is nothing to credit yet.
 */
export function createClaimActions(p: CreateClaimParams): STRK20_ACTION[] {
  return [
    { type: 'withdraw', token: p.token, amount: p.amount, recipient: p.escrow },
    {
      type: 'invoke',
      contract: p.escrow,
      calldata: [
        OPERATION.Deposit,
        p.commitment,
        p.token,
        p.amount,
        `0x${p.expiry.toString(16)}`,
        p.refundTo,
        p.prefund?.recipient ?? NONE,
        NONE, // sig_r — ignored on Deposit
        NONE, // sig_s
        p.prefund?.amount ?? NONE,
      ],
    },
  ];
}

/**
 * The inflow a pool transaction needs to balance the fee it pays out.
 *
 * The pool charges its fee by withdrawing to reimburse the relayer, and `assert_valid` requires
 * every token to net exactly zero across the transaction. A claimant with nothing inside the pool
 * has nothing for that withdrawal to subtract from, so the transaction is rejected by the protocol
 * — not by the wallet. Depositing the fee from the claimant's public balance in the same
 * transaction supplies the inflow. See `contracts/ONCHAIN-FINDINGS.md` §4.
 */
export interface FeeDeposit {
  token: string;
  /** Smallest unit. At least the pool's fee. */
  amount: string;
}

export interface ClaimParams {
  escrow: string;
  token: string;
  /** The address being paid. The signature authorises this address and no other. */
  claimant: string;
  /** The link public key. The contract recomputes the commitment from it. */
  pk: string;
  signature: ClaimSignature;
  /** Omit only when the claimant already holds enough inside the pool to cover the fee. */
  fee?: FeeDeposit;
}

/**
 * Claiming: open a note for an amount decided at execution, then have the escrow credit it.
 *
 * The transfer carries amount "OPEN" rather than a number. The escrow returns an `OpenNoteDeposit`
 * naming the amount it holds, and the pool credits the open note with it — so the claimant never
 * states a figure the sender chose.
 *
 * For a recipient with no viewing key, registration rides in front of this at phase 0.
 */
export function claimActions(p: ClaimParams): STRK20_ACTION[] {
  return [
    ...settleFee(p.fee),
    { type: 'transfer', token: p.token, amount: 'OPEN', recipient: p.claimant },
    {
      type: 'invoke',
      contract: p.escrow,
      calldata: settleCalldata(OPERATION.Claim, p.pk, p.claimant, p.signature),
    },
  ];
}

export interface RefundParams {
  escrow: string;
  token: string;
  /**
   * The address the refund signature authorises. It travels in the `claimant` position, which is
   * what the contract hashes into the refund message — the stored `refund_to` is metadata and
   * gates nothing.
   */
  refundTo: string;
  pk: string;
  signature: ClaimSignature;
  fee?: FeeDeposit;
}

/**
 * Refunding an expired claim. The same shape as a claim, authorised by a signature under its own
 * domain tag so a claim signature can never be replayed as a refund.
 */
export function refundActions(p: RefundParams): STRK20_ACTION[] {
  return [
    ...settleFee(p.fee),
    { type: 'transfer', token: p.token, amount: 'OPEN', recipient: p.refundTo },
    {
      type: 'invoke',
      contract: p.escrow,
      calldata: settleCalldata(OPERATION.Refund, p.pk, p.refundTo, p.signature),
    },
  ];
}

const settleFee = (fee?: FeeDeposit): STRK20_ACTION[] =>
  fee ? [{ type: 'deposit', token: fee.token, amount: fee.amount }] : [];

/**
 * Claim and Refund send the same ten felts; only the operation and the signature's domain differ.
 * `token`, `amount`, `expiry` and `refund_to` are ignored on both — the stored entry wins.
 */
const settleCalldata = (
  operation: string,
  pk: string,
  recipient: string,
  signature: ClaimSignature,
): string[] => [
  operation,
  pk, // the PUBLIC KEY; the contract hashes it to find the entry
  NONE, // token
  NONE, // amount
  NONE, // expiry
  NONE, // refund_to
  recipient,
  signature.r,
  signature.s,
  FIRST_OPEN_NOTE,
];
