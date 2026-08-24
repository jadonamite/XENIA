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
 */
export const FIRST_OPEN_NOTE = '${openNoteIds[0]}';

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
      ],
    },
  ];
}

export interface ClaimParams {
  escrow: string;
  token: string;
  /** The address being paid. The signature authorises this address and no other. */
  claimant: string;
  /** The link public key. The contract recomputes the commitment from it. */
  pk: string;
  signature: ClaimSignature;
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
    { type: 'transfer', token: p.token, amount: 'OPEN', recipient: p.claimant },
    {
      type: 'invoke',
      contract: p.escrow,
      calldata: [
        OPERATION.Claim,
        p.pk,
        p.claimant,
        p.signature.r,
        p.signature.s,
        FIRST_OPEN_NOTE,
      ],
    },
  ];
}

export interface RefundParams {
  escrow: string;
  token: string;
  /** The original sender, and the only address the contract will refund to. */
  refundTo: string;
  pk: string;
}

/**
 * Refunding an expired claim. Same shape as a claim; the contract authorises it on the expiry
 * having passed and the caller matching `refund_to`, so no signature is needed.
 */
export function refundActions(p: RefundParams): STRK20_ACTION[] {
  return [
    { type: 'transfer', token: p.token, amount: 'OPEN', recipient: p.refundTo },
    {
      type: 'invoke',
      contract: p.escrow,
      calldata: [OPERATION.Refund, p.pk, FIRST_OPEN_NOTE],
    },
  ];
}
