---
title: Fees
description: What the pool charges, why it must be funded from inside the transaction, and how Xenia settles it.
order: 4
---

# Fees

## What is charged

The STRK20 pool charges a flat fee per transaction, read live from the pool:

| | |
|---|---|
| Amount | **6 STRK** (`get_fee_amount()`) |
| Token | STRK — `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| Collector | `0xd79041634625e5288296fbc648088788710ba44903a3a49468a66567749e77` |

It is charged in STRK regardless of what the transaction moves. A claim denominated in USDC
still owes its fee in STRK.

There is no separate gas bill for the user. Private transactions are submitted by rotating
relayers; the relayer pays L2 gas and fronts the fee, then reimburses itself with a
`withdraw` out of the pool inside the same transaction.

## Why it needs an inflow

That reimbursement is the mechanic that matters.

The pool's [balance invariant](strk20.md#the-balance-invariant) requires every token to net
exactly zero across a transaction, and `withdraw` **subtracts**. The relayer's 6 STRK
withdrawal therefore needs 6 STRK of matching STRK inflow inside the same transaction.

A transaction that only *receives* has no such inflow. `subtract_balance` runs `checked_sub`,
goes negative, and panics `NEGATIVE_INTERMEDIATE_BALANCE`.

So the fee is not merely a cost. It is an inflow the transaction must supply. This is
enforced by the protocol, not by any wallet, and it applies to every anonymizer on STRK20 —
it is worth knowing before you build one.

## How Xenia settles it

Xenia's claim and refund action lists open with a `deposit` of the fee amount:

```js
{ type: 'deposit',  token: STRK, amount: POOL_FEE }
{ type: 'transfer', token,       amount: 'OPEN', recipient: claimant }
{ type: 'invoke',   contract: XENIA_ESCROW, calldata: [...] }
```

The deposit adds 6 STRK to the working balance; the relayer's withdrawal subtracts it; the
token nets to zero and the transaction is valid.

## Pre-funding from the escrow

Where the sender wants the claim to cost the recipient nothing, the deposit can carry the
fee to the claimant ahead of time. Positions 6 and 9 of the deposit calldata — unused on
that operation — take an address and an amount:

```js
calldata: [0, commitment, token, amount, expiry, refundTo, prefundTo, 0, 0, prefundAmount]
```

Two things to get right:

- **The escrow needs the fee token to send.** Add a second `withdraw` action for STRK
  alongside the claim token's, both to `XENIA_ESCROW`.
- **Pay out of the escrow, never from the sender's own address.** Funding a claimant
  directly publishes a sender → recipient edge and undoes the privacy the product exists
  for. Coming from a shared contract leaks nothing.

`ClaimPrefunded { commitment, recipient, amount }` is emitted when it happens. Zero in
either field skips it entirely, so links work with or without it.

## Sizing a claim

A claim worth less than the fee to redeem is not worth sending. Xenia refuses to create a
STRK claim below the fee amount at the point of creation, rather than letting the recipient
discover it.
