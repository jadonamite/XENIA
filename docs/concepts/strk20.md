---
title: STRK20 in five minutes
description: Notes, channels, phases and action lists — the pool mechanics Xenia is built on.
order: 1
---

# STRK20 in five minutes

Everything Xenia does is an ordinary STRK20 transaction. This page covers the parts of the
pool you need to follow the rest of the documentation.

## The pool

STRK20 is a single contract holding real ERC-20 tokens on behalf of many users. Balances
inside it are private: the contract knows the totals, observers do not know whose is whose.

On mainnet the pool lives at:

```
0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
```

The address published in the STRK20 documentation is Sepolia. Do not substitute it.

## Registration

An account participates by publishing a **viewing key** on-chain. Only that account can
publish it. From there it opens a **channel** (its own account inside the pool) and a
**subchannel** per token it wants to hold.

This is the deadlock Xenia removes — see [Introduction](../introduction.md).

## Notes

Private balance is held in **notes**. Two kinds matter here:

- **Encrypted notes** — the normal private balance. Amounts are hidden.
- **Open notes** — a note whose amount is plaintext, used when a contract needs to credit
  a specific amount to a specific account. A claim credits an open note.

Notes mature **ten blocks** after creation. A freshly claimed note is not immediately
spendable.

## Actions and phases

A STRK20 transaction is not a call. It is a **list of actions**, each belonging to a phase,
executed in phase order. A transaction may skip phases but never go backwards.

The five action types a client builds:

| Type | Does |
|---|---|
| `deposit` | move tokens from your public balance into the pool |
| `withdraw` | move tokens out of the pool to a public address |
| `transfer` | move value inside the pool, to a note or an account |
| `invoke` | call an external contract (an *anonymizer*) from inside the transaction |
| `shadow_account_invoke` | call from a shadow account |

The ordering that makes Xenia work:

| Phase | Action |
|---|---|
| 0 | `SetViewingKey` |
| 1 | `OpenChannel` |
| 2 | `OpenSubchannel` |
| 5 | `CreateOpenNote` |
| 7 | `InvokeExternal` |

Registration at phase 0, the external call at phase 7. One transaction, both.

**At most one external invoke per transaction.** Creating a claim and claiming it are
therefore always separate transactions.

## Anonymizers

An `invoke` action calls a contract the pool treats as an *anonymizer*. Two things define
the interface:

1. **The pool is always the caller.** `get_caller_address()` inside the anonymizer is the
   pool's address, on every path. The user's address never reaches the contract — that is
   the entire point of routing through the pool. Anonymizers cannot authorise anything by
   caller; they authorise by signature.

2. **Calldata is positional.** The pool forwards a `Span<felt252>` that Starknet
   deserialises straight into the entry point's parameters. Every parameter is always
   present, in order, on every operation. A short array fails to deserialise before your
   contract runs.

The anonymizer returns a `Span<OpenNoteDeposit>` — zero or more credits the pool applies to
open notes in the same transaction.

## The balance invariant

This is the rule that surprises people, and the one that shapes Xenia's fee handling.

Per token, across a transaction, the pool tracks inflows and outflows:

- `deposit` and `use_note` **add** to the pool's working balance
- `withdraw`, `create_enc_note` and `create_open_note` **subtract** from it

Subtraction uses `checked_sub` and panics `NEGATIVE_INTERMEDIATE_BALANCE` if it would go
negative. At the end, `assert_valid` requires every token to net **exactly zero**, or the
transaction reverts `FINAL_BALANCE_MUST_BE_ZERO`.

So a transaction cannot spend value it did not bring. That includes the pool's own fee —
which is why [fees](fees.md) has a page of its own.

## Wallet discovery

STRK20-capable wallets register through the [Wallet Standard](https://github.com/wallet-standard/wallet-standard)
(`getWallets()` from `@wallet-standard/app`), not the legacy `window.starknet_*` globals.
Xenia probes each registered wallet for the STRK20 methods before offering it.
