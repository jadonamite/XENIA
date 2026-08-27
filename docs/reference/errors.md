---
title: Errors
description: Every revert reason XeniaEscrow can produce, and what causes it.
order: 3
---

# Errors

## Contract reverts

### Deposit

| Error | Cause |
|---|---|
| `ZERO_COMMITMENT` | Position 1 was zero. Check the commitment was derived, not defaulted |
| `ZERO_TOKEN` | Position 2 was zero |
| `ZERO_AMOUNT` | Position 3 was zero |
| `EXPIRY_IN_PAST` | `expiry` is not strictly greater than the current block timestamp. Note it is an **absolute** Unix timestamp, not a duration |
| `COMMITMENT_EXISTS` | That commitment already has an entry. Each link key is used once |

### Claim and refund

| Error | Cause |
|---|---|
| `COMMITMENT_NOT_FOUND` | No entry under `poseidon(TAG, pk)`. Usually the commitment was passed at position 1 instead of the public key — or the create transaction never landed |
| `ALREADY_CLAIMED` | The entry was already settled, by a claim or a refund. `claimed` flips exactly once |
| `CLAIM_EXPIRED` | Claiming at or after the expiry. Refund it instead |
| `NOT_YET_EXPIRED` | Refunding before the expiry |
| `BAD_SIGNATURE` | The claim signature did not verify. Check the tag is `XENIA_CLAIM_V1`, the message hashes the **commitment** (not `pk`), and the address signed over is the same one at position 6 |
| `NOT_REFUND_OWNER` | The refund signature did not verify. Same checks, under `XENIA_REFUND_V1` |

### Always

| Error | Cause |
|---|---|
| `CALLER_NOT_PRIVACY` | The entry point was called directly rather than through the pool. `privacy_invoke` only accepts the STRK20 pool as caller |

## Pool reverts

These come from STRK20, not from Xenia, and they are the ones that confuse people.

| Error | Cause |
|---|---|
| `NEGATIVE_INTERMEDIATE_BALANCE` | A withdrawal exceeded the working balance for that token mid-transaction. On a claim this almost always means the fee deposit is missing — see [fees](../concepts/fees.md) |
| `FINAL_BALANCE_MUST_BE_ZERO` | A token did not net to zero across the transaction. Something came in that was never spent, or vice versa |

## Deserialisation failures

A calldata array shorter or longer than ten elements fails to deserialise **before** the
contract runs, so the error points at the pool rather than at Xenia and names no Xenia
error string. If a change to your calldata produces an opaque failure, count the elements
first. See [action lists](../integrate/action-lists.md).

Placeholders are the other common cause: `${openNoteIds[0]}` must stay a literal string for
the wallet to substitute it. Hex-encoding it produces a value the pool cannot resolve.

## Client-side

| Message | Cause |
|---|---|
| `The escrow address is not configured for this build` | `NEXT_PUBLIC_XENIA_ESCROW` was unset at build time. It is baked in at build — redeploy after setting it |
| `Please connect your Starknet wallet first` | No wallet selected |
| No wallets listed | The wallet does not register through the Wallet Standard, or does not expose the STRK20 methods |

## Debugging

Dry-run with `strk20PrepareInvoke` before submitting. It surfaces deserialisation failures
and balance-invariant violations without spending anything, and it is the fastest way to
find a calldata mistake.
