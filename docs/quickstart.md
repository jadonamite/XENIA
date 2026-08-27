---
title: Quickstart
description: Send a private payment and claim it, end to end.
order: 2
---

# Quickstart

Two people, two transactions, about three minutes.

## What you need

**Sender** — a Starknet wallet with STRK20 support, and a shielded balance in the pool.
Shielding is the ordinary public deposit into STRK20 that any pool user makes; Xenia spends
from that balance and never touches your public one.

**Recipient** — a Starknet wallet. Nothing else. No pool account, no prior registration, no
shielded balance.

## 1. Create the claim

Open [usexenia.vercel.app/create](https://usexenia.vercel.app/create).

1. Connect your wallet.
2. Pick a token — STRK, ETH or USDC — and an amount.
3. Pick how long the link stays claimable: 1 hour, 1 day, 7 days or 30 days.
4. Slide to pay.

Your wallet submits one STRK20 transaction. It moves the amount out of your private balance
into `XeniaEscrow` and records a commitment against it.

You get a URL back:

```
https://usexenia.vercel.app/c#0x04f1…
```

Everything after the `#` is the link key. It is a private key, it never leaves the browser,
and it is not sent to any server — URL fragments are not transmitted in HTTP requests.

## 2. Send the link

Any channel you like. Treat it like cash: whoever holds the link can claim it. See
[claim links](concepts/claim-links.md) for the exact bearer semantics.

## 3. Claim it

The recipient opens the link and connects a wallet. The page reads the claim's state
directly from the chain and shows the token, the amount, and the expiry.

They press **Claim**. One STRK20 transaction:

- publishes their viewing key, if they have none
- opens their channel and the token's subchannel, if missing
- creates the open note the claim will credit
- calls `XeniaEscrow.privacy_invoke`, which verifies the signature and returns the deposit
  that credits the note

The funds land in their private balance. Notes mature ten blocks after creation, so the
balance is spendable shortly after inclusion.

## 4. Refund, if nobody claims

After the expiry passes, the sender opens **My Links**, finds the claim, and presses
**Refund**. The escrow releases the funds back into the sender's private balance.

Refund is a sweep, not an automatic return — it happens when the sender asks for it. See
[refund a payment](guides/refund.md).

## Next

- [Send a payment](guides/send.md) — the sender's flow in detail.
- [Claim a payment](guides/claim.md) — the recipient's flow in detail.
- [Fees](concepts/fees.md) — what a claim costs and who settles it.
