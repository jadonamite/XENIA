---
title: The escrow contract
description: XeniaEscrow's entry point, calldata layout, storage, events and read helpers.
order: 1
---

# The escrow contract

`XeniaEscrow` is a STRK20 anonymizer. It parks value behind a link key, releases it against
a signature, and returns it to the sender after expiry. Nothing about it is Xenia-specific.
It is deployed on mainnet and Sepolia under the same class hash, tested, and MIT-licensed —
**use ours, or fork it.**

Source: [`contracts/src/xenia_escrow.cairo`](https://github.com/jadonamite/XENIA/blob/main/contracts/src/xenia_escrow.cairo).
Addresses: [deployments](../reference/deployments.md).

## Entry point

One entry point serves all three operations.

```cairo
fn privacy_invoke(
    ref self: ContractState,
    operation: XeniaOperation,   // 0 = Deposit, 1 = Claim, 2 = Refund
    commitment: felt252,
    token: ContractAddress,
    amount: u128,
    expiry: u64,
    refund_to: ContractAddress,
    claimant: ContractAddress,
    sig_r: felt252,
    sig_s: felt252,
    note_id: felt252,
) -> Span<OpenNoteDeposit>;
```

The pool forwards a `Span<felt252>` that Starknet deserialises **positionally** into these
parameters. Every parameter is always present, in this order, on every operation; unused
ones are passed as `0`. The enum serialises as a single felt discriminant.

**A short array fails to deserialise before your contract runs.** Ten elements, always.

## Calldata by operation

| Position | Field | Deposit | Claim | Refund |
|---:|---|---|---|---|
| 0 | `operation` | `0` | `1` | `2` |
| 1 | `commitment` | `poseidon(TAG, pk)` | **`pk`** | **`pk`** |
| 2 | `token` | token address | `0` | `0` |
| 3 | `amount` | `u128` | `0` | `0` |
| 4 | `expiry` | absolute unix ts | `0` | `0` |
| 5 | `refund_to` | sender's address | `0` | `0` |
| 6 | `claimant` | `0`, or an address to pre-fund | claimant address | refunder address |
| 7 | `sig_r` | `0` | signature r | signature r |
| 8 | `sig_s` | `0` | signature s | signature s |
| 9 | `note_id` | `0`, or the amount to pre-fund | `${openNoteIds[0]}` | `${openNoteIds[0]}` |

**Row 1 is the easy mistake.** On Deposit you pass the *hash*. On Claim and Refund you pass
the *public key* — the contract hashes it itself and looks that up, so a passed-in
commitment is never trusted as authorisation. Passing the hash on a claim finds nothing and
reverts `COMMITMENT_NOT_FOUND`.

**Row 9 stays a literal string** on Claim and Refund. `${openNoteIds[0]}` is a placeholder
the wallet substitutes when it builds the transaction. Hex-encoding it breaks the
substitution.

## What each operation does

**Deposit.** Asserts a non-zero commitment, token and amount, an expiry in the future, and
that the commitment is unused. Stores a `ClaimEntry`, emits `ClaimCreated`, and optionally
pre-funds an address. Returns an **empty span** — the tokens arrived by a `withdraw` action
before the invoke ran, so there is nothing to credit.

**Claim.** Recomputes `poseidon(['XENIA_COMMITMENT_V1', pk])`, loads the entry, asserts it
is unclaimed and strictly before expiry, verifies the signature over
`poseidon(['XENIA_CLAIM_V1', commitment, claimant])`, flips `claimed`, approves the pool to
pull the tokens, emits `ClaimRedeemed`, and returns one `OpenNoteDeposit`.

**Refund.** The same, at or after expiry, under `XENIA_REFUND_V1`, emitting `ClaimRefunded`.

Claim and refund are mutually exclusive: `claimed` flips exactly once.

## Storage

```cairo
pub struct ClaimEntry {
    pub token: ContractAddress,
    pub amount: u128,
    pub expiry: u64,        // claims valid strictly before, refunds at or after
    pub refund_to: ContractAddress,
    pub claimed: bool,      // flips exactly once, by a claim or a refund
}
```

Keyed by the **commitment hash**.

## Events

All indexed on `commitment`, so a claim's state is a log query and a client needs no server.

| Event | Emitted by | Fields |
|---|---|---|
| `ClaimCreated` | Deposit | `commitment` (key), `token`, `amount`, `expiry` |
| `ClaimPrefunded` | Deposit | `commitment` (key), `recipient`, `amount` |
| `ClaimRedeemed` | Claim | `commitment` (key), `claimant`, `amount` |
| `ClaimRefunded` | Refund | `commitment` (key), `refund_to`, `amount` |

A claim is outstanding if it has a `ClaimCreated` and neither `ClaimRedeemed` nor
`ClaimRefunded`.

## Read helpers

```cairo
fn get_claim(commitment: felt252) -> ClaimEntry;  // keyed by the HASH; zero token = not found
fn privacy_contract() -> ContractAddress;
```

`get_claim` returns fields in declaration order: `token, amount, expiry, refund_to, claimed`.

## Refund authorisation

`privacy_invoke` is always called *by the privacy pool*, so `get_caller_address()` is the
pool's address on every path, including refund. The sender's own address never reaches the
contract — that is the entire point of routing through the pool. A `caller == refund_to`
assert would reject every refund that has ever been made.

Refund is therefore authorised by **signature** under `XENIA_REFUND_V1`, post-expiry,
reverting `NOT_REFUND_OWNER` when it fails. The sender generated `sk`, so the sender can
always sign.

- **`refund_to` is metadata, not an access check.** Stored, emitted, useful to a UI, gates
  nothing. The `OpenNoteDeposit` credits the note in the submitting transaction, so the
  contract cannot force funds to a specific address regardless.
- **After expiry, anyone holding the link can sweep it** — a capability they already had
  before expiry, when they could simply have claimed.
- The separate domain tag makes a claim signature unusable as a refund, and the reverse.

The alternative — a direct ERC-20 transfer to `refund_to` — is enforceable, but it publishes
the sender's address next to the escrow and destroys the unlinkability the escrow exists
for.

## Four things worth knowing before you build on it

Each of these cost the sprint time to learn. Working and measurements in
[`contracts/ONCHAIN-FINDINGS.md`](https://github.com/jadonamite/XENIA/blob/main/contracts/ONCHAIN-FINDINGS.md),
taken from the pool's source and its mainnet transaction history rather than from
documentation.

1. **A first-time claimant cannot pay the pool fee.** The relayer fronts it and reclaims it
   with a `withdraw`, and the pool's balance invariant needs a matching inflow — which
   someone holding nothing inside the pool has none of. The transaction is refused by the
   protocol, not the wallet. Deposit's two optional parameters fix it. See
   [fees](../concepts/fees.md).
2. **Pay that fee from the escrow, never from the sender's address.** Funding a claimant
   directly puts a public sender → recipient edge on chain and undoes the privacy.
3. **Claim and refund pass the link public key**, not the commitment.
4. **Refund cannot check who is asking.** Authorise by signature.

## Errors

`ZERO_COMMITMENT`, `ZERO_TOKEN`, `ZERO_AMOUNT`, `EXPIRY_IN_PAST`, `COMMITMENT_EXISTS`,
`COMMITMENT_NOT_FOUND`, `ALREADY_CLAIMED`, `CLAIM_EXPIRED`, `NOT_YET_EXPIRED`,
`NOT_REFUND_OWNER`, `BAD_SIGNATURE`, `CALLER_NOT_PRIVACY`.

Each explained in [errors](../reference/errors.md).
