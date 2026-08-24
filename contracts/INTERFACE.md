# `XeniaEscrow` — frozen interface

Frozen Day 1 (2026-08-24). The client builds against this document. Any change lands **here first**,
and both people are told before either pushes.

Source of truth for the shape: [`src/xenia_escrow.cairo`](src/xenia_escrow.cairo). This file
explains how to drive it.

---

## Entry point

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

The pool deserialises calldata straight into these parameters. **Every parameter is always
present**, in this order, on every operation — unused ones are passed as `0`. The enum serialises
as a single felt discriminant.

Verified against the built ABI in `target/dev/xenia_XeniaEscrow.contract_class.json`.

## Calldata by operation

| Position | Field | Deposit | Claim | Refund |
|---:|---|---|---|---|
| 0 | `operation` | `0` | `1` | `2` |
| 1 | `commitment` | `poseidon(TAG, pk)` | **`pk`** | **`pk`** |
| 2 | `token` | token address | `0` | `0` |
| 3 | `amount` | `u128` | `0` | `0` |
| 4 | `expiry` | absolute unix ts | `0` | `0` |
| 5 | `refund_to` | sender's address | `0` | `0` |
| 6 | `claimant` | `0` | claimant address | refunder address |
| 7 | `sig_r` | `0` | signature r | signature r |
| 8 | `sig_s` | `0` | signature s | signature s |
| 9 | `note_id` | `0` | `${openNoteIds[0]}` | `${openNoteIds[0]}` |

> **Row 1 is the easy mistake.** On Deposit you pass the *hash*. On Claim and Refund you pass the
> *public key* — the contract hashes it itself and looks that up. Passing the hash on a claim finds
> nothing and reverts `COMMITMENT_NOT_FOUND`.

## Key derivation — client side

```
sk         = random felt (CSPRNG, reduced into the STARK field)
pk         = stark_curve_public_key(sk)
commitment = poseidon([ 'XENIA_COMMITMENT_V1', pk ])
```

The link is `https://<host>/c#<sk>` — the fragment is never sent to a server.

To claim, sign with `sk`:

```
message   = poseidon([ 'XENIA_CLAIM_V1',  commitment, claimant ])
(r, s)    = sign(message, sk)
```

To refund, the same but under a different tag:

```
message   = poseidon([ 'XENIA_REFUND_V1', commitment, refunder ])
```

`commitment` in both messages is the **hash**, not `pk`. The tags are Cairo short strings; in JS
use `encodeShortString('XENIA_CLAIM_V1')` and Poseidon over the felt array.

## Action lists

**Create a claim** (PRD §5.1):

```js
{ type: 'withdraw', token, amount, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [0, commitment, token, amount, expiry, refundTo, 0, 0, 0, 0] }
```

**Claim** (PRD §5.2):

```js
{ type: 'transfer', token, amount: 'OPEN', recipient: claimant }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [1, pk, 0, 0, 0, 0, claimant, sigR, sigS, '${openNoteIds[0]}'] }
```

**Refund** — identical to claim with `operation = 2` and the refund-tagged signature.

Dry-run every calldata change with `strk20PrepareInvoke` before submitting.

## Events

Indexed on `commitment` (the hash), so `/claims` can read status with no server.

| Event | Emitted by | Fields |
|---|---|---|
| `ClaimCreated` | Deposit | `commitment` (key), `token`, `amount`, `expiry` |
| `ClaimRedeemed` | Claim | `commitment` (key), `claimant`, `amount` |
| `ClaimRefunded` | Refund | `commitment` (key), `refund_to`, `amount` |

A claim is outstanding if it has a `ClaimCreated` and neither of the other two.

## Errors

`ZERO_COMMITMENT`, `ZERO_TOKEN`, `ZERO_AMOUNT`, `EXPIRY_IN_PAST`, `COMMITMENT_EXISTS`,
`COMMITMENT_NOT_FOUND`, `ALREADY_CLAIMED`, `CLAIM_EXPIRED`, `NOT_YET_EXPIRED`, `NOT_REFUND_OWNER`,
`BAD_SIGNATURE`, `CALLER_NOT_PRIVACY`.

## Read-only helpers

```cairo
fn get_claim(commitment: felt252) -> ClaimEntry;  // keyed by the HASH; zero token = not found
fn privacy_contract() -> ContractAddress;
```

---

## Deviation from PRD §4.4.6 — refund authorisation

**PRD §4.4 invariant 6 says refund requires "a caller matching `refund_to`". That check cannot be
implemented as written, and the contract does something else.**

`privacy_invoke` is always called *by the privacy pool*, so `get_caller_address()` is the pool's
address on every path, including refund. The sender's own address never reaches the contract —
that is the entire point of routing through the pool. A `get_caller_address() == refund_to` assert
would reject every refund that has ever been made.

What the contract does instead: **refund is authorised by a signature under
`XENIA_REFUND_TAG_V1`**, post-expiry, and reverts `NOT_REFUND_OWNER` when it fails. The sender
generated `sk`, so the sender can always sign. Consequences worth being deliberate about:

- **`refund_to` is metadata, not an access check.** It is stored, emitted in `ClaimRefunded`, and
  useful for the `/claims` UI — but it does not gate anything. The `OpenNoteDeposit` credits the
  note in the submitting transaction, so the contract cannot force funds to a specific address
  even if it wanted to.
- **After expiry, anyone holding the link can sweep it** — but they could have claimed it before
  expiry anyway, so this grants no capability they did not already have. Consistent with the
  README's bearer-instrument row.
- The separate domain tag means a claim signature can never be replayed as a refund, or vice versa.

The alternative — a direct ERC-20 transfer to `refund_to` with an empty span — *is* enforceable,
but it publishes the sender's address next to the escrow and contradicts ARCHITECTURE §4, which
specifies the refund credits "the sender's own open note". **Sam's call; flagged rather than
decided silently.** PRD §4.4.6 and the §4.7 refund test should be reworded to match whichever
survives.
