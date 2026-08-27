---
title: Claim a payment
description: Redeeming a link, including the registration that happens inside it.
order: 2
---

# Claim a payment

## What you need

A Starknet wallet. That is the whole list — no pool account, no prior registration, no
shielded balance.

## The flow

Open the link. It looks like `https://usexenia.vercel.app/c#0x04f1c8…`.

**1. The page reads the claim.** It derives the commitment from the key in the fragment and
calls `get_claim(commitment)` over RPC. No server is involved. You see the token, the
amount, and the expiry, along with one of four states:

| State | Meaning |
|---|---|
| `claimable` | Live and unredeemed |
| `claimed` | Already redeemed |
| `expired` | Past its expiry; only the sender can sweep it now |
| `unknown` | No entry under that commitment — a zero token means not found |

**2. Connect a wallet.**

**3. Press Claim.** One transaction, and it does everything.

## What the transaction does

Xenia builds three actions; the wallet adds the setup phases in front of them:

```js
{ type: 'deposit',  token: STRK, amount: POOL_FEE }
{ type: 'transfer', token,       amount: 'OPEN', recipient: claimant }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [1, pk, 0, 0, 0, 0, claimant, sigR, sigS, '${openNoteIds[0]}'] }
```

In phase order the full transaction is:

| Phase | Action | Effect |
|---|---|---|
| 0 | `SetViewingKey` | registers you, if you have no key |
| 1 | `OpenChannel` | opens your channel, if missing |
| 2 | `OpenSubchannel` | opens the token's subchannel, if missing |
| 3 | `deposit` | funds the pool fee — see [fees](../concepts/fees.md) |
| 5 | `CreateOpenNote` | creates the note the claim credits |
| 7 | `invoke` | calls `XeniaEscrow.privacy_invoke` |

Inside the invoke the escrow recomputes the commitment from the public key you passed,
loads the entry, checks that it is unclaimed and unexpired, verifies your signature, marks
it claimed, approves the pool to pull the tokens, and returns an `OpenNoteDeposit`. The pool
applies that deposit to your open note.

Registration and payment, one atomic transaction. Either all of it happens or none of it
does.

## The signature

Before submitting, the page signs with the link key:

```
message = poseidon(['XENIA_CLAIM_V1', commitment, claimant])
(r, s)  = sign(message, sk)
```

`claimant` is your connected address. That binding is what stops a mempool observer from
lifting the authorisation out of calldata and redirecting the funds to themselves — a copied
signature authorises an address they do not control.

Xenia verifies the signature locally before it is submitted, so a mismatch fails in the UI
rather than as a revert.

## Two details

- **Pass the public key, not the commitment.** Position 1 on a claim is `pk`. The contract
  hashes it and looks that up itself, so a passed-in commitment is never trusted as
  authorisation. Passing the hash finds nothing and reverts `COMMITMENT_NOT_FOUND`.
- **`${openNoteIds[0]}` stays a literal string.** The wallet substitutes the real note id
  when it builds the transaction. Hex-encoding it breaks the substitution.

## After claiming

The funds are in your private balance. Notes mature ten blocks after creation, so the
balance becomes spendable shortly after inclusion.

You are now a registered pool user. Nothing further is needed to receive again.
