---
title: Refund a payment
description: Reclaiming a link nobody redeemed.
order: 3
---

# Refund a payment

A claim that passes its expiry stops being claimable and becomes refundable. The sender
sweeps it back into their private balance.

## The flow

Open **My Links**. Each claim you have created is listed with its live on-chain status,
read from `get_claim` — not from local state, so a claim redeemed on another device shows
as claimed here too.

Once a claim shows `expired`, press **Refund**.

## What the transaction does

The same shape as a claim, with a different operation and a differently tagged signature:

```js
{ type: 'deposit',  token: STRK, amount: POOL_FEE }
{ type: 'transfer', token,       amount: 'OPEN', recipient: refundTo }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [2, pk, 0, 0, 0, 0, refundTo, sigR, sigS, '${openNoteIds[0]}'] }
```

The escrow checks the entry is unclaimed and **past** its expiry, verifies the signature,
marks it settled, and returns the `OpenNoteDeposit` that credits your note.

## The signature

```
message = poseidon(['XENIA_REFUND_V1', commitment, refunder])
(r, s)  = sign(message, sk)
```

Note the tag. `XENIA_REFUND_V1` is a different domain from `XENIA_CLAIM_V1`, so a claim
signature can never be replayed as a refund, or a refund as a claim.

## Why a signature and not an owner check

`privacy_invoke` is always called by the pool, so `get_caller_address()` is the pool's
address on every path — including refund. The sender's own address never reaches the
contract. That is the entire point of routing through the pool, and it means a
`caller == refund_to` check would reject every refund ever made.

Possession of the link key is the only authorisation available, and it is sufficient: the
sender generated `sk`, so the sender can always sign.

Two consequences, both deliberate:

- **`refund_to` is metadata, not an access check.** It is stored and emitted in
  `ClaimRefunded` and used by the UI, but it gates nothing. The `OpenNoteDeposit` credits
  the note in the submitting transaction, so the contract could not force funds to a named
  address even if it tried.
- **After expiry, anyone still holding the link can sweep it.** They could have claimed it
  before expiry anyway, so this grants no capability they did not already have. Expiry is a
  deadline, not a lock.

## Refund is a sweep, not an automatic return

Nothing happens at the expiry timestamp. The funds sit in the escrow until someone
holding the link asks for them. Treat expiry as the moment your claim becomes reclaimable,
and reclaim it.

## Errors you might see

| Revert | Cause |
|---|---|
| `NOT_YET_EXPIRED` | The expiry has not passed |
| `ALREADY_CLAIMED` | The recipient redeemed it first |
| `COMMITMENT_NOT_FOUND` | Wrong key, or the create transaction never landed |
| `NOT_REFUND_OWNER` | The signature did not verify against the stored commitment |

Full list: [errors](../reference/errors.md).
