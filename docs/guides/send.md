---
title: Send a payment
description: Creating a claim link, step by step, and what happens on-chain.
order: 1
---

# Send a payment

## Before you start

You need a shielded balance in the STRK20 pool. Xenia spends from your **private** balance,
not your public one, so shield first if you have not.

## The flow

Open [/create](https://usexenia.vercel.app/create).

**1. Connect.** Xenia lists every wallet registered through the Wallet Standard that
supports the STRK20 methods.

**2. Choose a token and amount.** STRK, ETH or USDC. Amounts are entered in display units
and converted to the token's smallest unit before they cross the wire.

**3. Choose an expiry.** 1 hour, 1 day, 7 days or 30 days. This is an absolute Unix
timestamp on-chain, and it is what makes a refund possible — see
[refund a payment](refund.md).

**4. Slide to pay.** Your wallet builds and submits one STRK20 transaction.

## What the transaction does

Two actions, in phase order:

```js
{ type: 'withdraw', token, amount, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [0, commitment, token, amount, expiry, refundTo, 0, 0, 0, 0] }
```

The `withdraw` moves the tokens out of the pool to the escrow. The `invoke` records a
`ClaimEntry` under the commitment and emits `ClaimCreated`. The escrow returns an **empty
span** — no note is credited, because the tokens have already moved.

`refundTo` is your address. It is stored and emitted so **My Links** can display it. It is
metadata, not an access check — refunds are authorised by signature. See
[the escrow contract](../integrate/escrow-contract.md#refund-authorisation).

## The link

Before the transaction is built, Xenia generates a link key in the browser:

```
sk         = CSPRNG random, reduced into the STARK field
pk         = stark_curve_public_key(sk)
commitment = poseidon(['XENIA_COMMITMENT_V1', pk])
```

Only `commitment` goes on-chain. The URL you get back carries `sk` in the fragment:

```
https://usexenia.vercel.app/c#0x04f1c8…
```

Fragments are not transmitted in HTTP requests, so the key never reaches a server.

## After sending

The claim is saved to your browser's local storage — commitment, key, token, amount,
expiry, transaction hash — so **My Links** can show live status and offer a refund. That
copy is local; clearing site data loses it. The link itself is the copy that matters.

## Things to know

- **A claim link is a bearer instrument.** Whoever holds it can claim it. Send it over a
  channel you trust; a lost link can only be refunded, by you, after expiry.
- **Redemption costs the recipient the pool's 6 STRK fee.** Xenia refuses to create a STRK
  claim smaller than that rather than letting the recipient find out. See
  [fees](../concepts/fees.md), including how to pre-fund it from the escrow.
- **One external invoke per transaction.** Creating a claim is always its own transaction.
