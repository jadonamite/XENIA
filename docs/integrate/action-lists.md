---
title: Action lists
description: The exact STRK20 batches Xenia submits, and why each action is there.
order: 2
---

# Action lists

A STRK20 transaction is a list of actions executed in phase order. These are the three
Xenia builds. Each is produced by a pure function in
[`src/lib/xenia/actions.ts`](https://github.com/jadonamite/XENIA/blob/main/src/lib/xenia/actions.ts)
and covered by tests that assert every calldata array is exactly ten elements.

## Create a claim

```js
{ type: 'withdraw', token, amount, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [0, commitment, token, amount, expiry, refundTo, 0, 0, 0, 0] }
```

The `withdraw` moves the tokens out of the pool to the escrow's public address. It runs
before the invoke, so by the time the escrow's code executes it already holds the funds —
which is why deposit returns an empty span.

**With pre-funding**, so the claimant arrives with an empty wallet:

```js
{ type: 'withdraw', token,      amount,   recipient: XENIA_ESCROW }
{ type: 'withdraw', token: STRK, amount: POOL_FEE, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [0, commitment, token, amount, expiry, refundTo,
             prefundTo, 0, 0, prefundAmount] }
```

The second `withdraw` is not optional — the escrow cannot send a fee token it does not
hold. A claim denominated in USDC still owes its fee in STRK.

## Claim

```js
{ type: 'deposit',  token: STRK, amount: POOL_FEE }
{ type: 'transfer', token,       amount: 'OPEN', recipient: claimant }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [1, pk, 0, 0, 0, 0, claimant, sigR, sigS, '${openNoteIds[0]}'] }
```

Three actions, each load-bearing:

- **`deposit`** supplies the STRK inflow the relayer's fee withdrawal will consume.
  Without it the pool's balance invariant fails with `NEGATIVE_INTERMEDIATE_BALANCE`. See
  [fees](../concepts/fees.md).
- **`transfer` with `amount: 'OPEN'`** creates the open note the escrow's return value
  credits. `'OPEN'` means the amount is measured at execution rather than declared.
- **`invoke`** calls the escrow, which verifies the signature and returns the
  `OpenNoteDeposit`.

Ordering is by phase, and the wallet prepends the setup actions — `SetViewingKey`,
`OpenChannel`, `OpenSubchannel` — for an account that needs them.

## Refund

Identical to a claim, with `operation = 2`, the refund-tagged signature, and the refunder in
place of the claimant:

```js
{ type: 'deposit',  token: STRK, amount: POOL_FEE }
{ type: 'transfer', token,       amount: 'OPEN', recipient: refundTo }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [2, pk, 0, 0, 0, 0, refundTo, sigR, sigS, '${openNoteIds[0]}'] }
```

## Rules that are easy to break

**Ten elements, always.** The pool deserialises positionally. A nine-element array fails
before the contract runs, with an error that points nowhere useful.

**Placeholders stay literal strings.** `${openNoteIds[0]}` and `${poolAddress}` are
substituted by the wallet at build time. Hex-encoding or resolving them yourself breaks the
substitution.

**One external invoke per transaction.** Creating and claiming are always separate
transactions.

**Phases go forwards only.** A transaction may skip a phase but never revisit one. Ordering
the actions correctly is the client's job.

## Verify before you submit

Dry-run every calldata change with `strk20PrepareInvoke` before submitting. It surfaces
deserialisation and invariant failures without spending anything.
