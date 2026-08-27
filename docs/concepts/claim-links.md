---
title: Claim links
description: What a Xenia link actually carries, and what holding one entitles you to.
order: 2
---

# Claim links

## A link is a private key

A Xenia link looks like this:

```
https://usexenia.vercel.app/c#0x04f1c8…
```

The fragment is a **STARK-curve private key**, generated in the sender's browser from the
platform CSPRNG and reduced into the curve order. It is not a password and it is not an
identifier — it is a signing key.

Three values derive from it:

```
sk         = random felt                              the link key
pk         = stark_curve_public_key(sk)               the Stark key: x coordinate only
commitment = poseidon(['XENIA_COMMITMENT_V1', pk])    the on-chain identity of the claim
```

Only the commitment goes on-chain when the claim is created. It reveals nothing about the
link, and the escrow's storage is keyed by it.

## Why a key and not a secret

The obvious design parks funds behind `hash(secret)` and releases them to whoever presents
the preimage. The [reference escrow helper](https://strk20-by-example.org/helpers/escrow)
does exactly that.

It has a front-running hole. The claim transaction carries its authorisation in **public
calldata**. Anyone watching the mempool sees the secret before the transaction is included,
and can submit their own claim naming themselves as the recipient.

Xenia closes it by making the authorisation address-specific. To claim, the holder signs a
message binding the claim to the address being paid:

```
message = poseidon(['XENIA_CLAIM_V1', commitment, claimant])
(r, s)  = sign(message, sk)
```

A copied signature authorises exactly one address — one the copier does not control.
Replaying it pays the intended recipient.

Full derivation and test vectors: [link keys and signatures](../integrate/signatures.md).

## Bearer semantics

**A claim link is a bearer instrument.** Whoever holds the link holds the key, and whoever
holds the key can claim. Anyone you send it to, and anyone they forward it to, can spend it.

This is a property of the design, not a gap to be closed later. A link that could only be
redeemed by a pre-named address would need the sender to know the recipient's address —
which is the deadlock Xenia exists to remove.

Treat a link like cash:

- Send it over a channel you trust.
- A lost link cannot be recovered. It can only be refunded, by the sender, after expiry.
- A link that has been claimed is spent. The contract reverts `ALREADY_CLAIMED` on a second
  attempt.

What a mempool observer **cannot** do is steal a claim already in flight. That is the part
the signature buys you.

## Expiry

Every claim carries an absolute Unix timestamp. Before it, the link is claimable. After it,
the link is refundable and the contract reverts `CLAIM_EXPIRED` on a claim attempt.

Expiry is a deadline, not a lock. After it passes, anyone still holding the link can sweep
it as a refund — but they could have claimed it before expiry anyway, so it grants no
capability they did not already have. See [refund a payment](../guides/refund.md).

## Where the secret lives

The fragment of a URL is never transmitted in an HTTP request. Xenia's claim page reads it
from `window.location.hash` in the browser and never sends it anywhere. There is no server
in the claim path — the page reads chain state directly over RPC.

The sender's copy is kept in browser local storage so **My Links** can show status and
offer refunds. Clearing site data loses it; the link itself is the only copy that matters.
