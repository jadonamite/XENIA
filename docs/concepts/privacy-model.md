---
title: Privacy model
description: What Xenia hides, what stays public, and what an observer can infer.
order: 3
---

# Privacy model

Xenia hides **who paid whom**. It does not hide everything, and the difference is worth
being precise about.

## The guarantee

A payment through Xenia puts no edge between the sender and the recipient on-chain. There
are two transactions, and neither of them names both parties:

1. The sender's transaction moves value from their private balance to `XeniaEscrow` and
   records a commitment. It does not name a recipient — at that moment the sender may not
   know who will claim.
2. The recipient's transaction credits their note from `XeniaEscrow`. It does not name a
   sender.

The only thing linking the two is the commitment, which is a hash of a key that exists in
one place: the link. An observer sees a deposit into a shared escrow and, later, a
withdrawal from the same shared escrow. Which deposit funded which claim is a guess over
every claim the escrow is holding.

That set is the anonymity set, and it grows with the escrow's traffic. Every Xenia user
shares one address.

## What is hidden

| | |
|---|---|
| Recipient identity | Hidden. Nothing in the sender's transaction names them |
| Recipient's balance | Hidden. Private balances are the pool's core property |
| Sender → recipient edge | Hidden. No transaction contains both |
| Which claim a deposit funds | Hidden behind the commitment |

## What is public

| | |
|---|---|
| The escrow's deposits and withdrawals | Public. Observers see the pool paid the escrow, not who initiated it |
| Claim amounts | Public. Open-note amounts are plaintext by design — the pool measures them at execution |
| The sender's original shield | Public, as every shield is |
| Timing | Public. Deposit and claim are timestamped by inclusion |

Amount visibility is STRK20's model, not Xenia's choice: an open note exists precisely so a
contract can credit a known amount, and the pool reads it at execution time.

## Threat model

**A mempool observer.** Sees claim transactions before inclusion, including the signature in
calldata. Cannot redirect a claim — the signature authorises one address. Can learn the
amount and the claimant, both of which are public anyway once included.

**A chain analyst.** Sees the escrow's full deposit and withdrawal history. Correlates by
amount and by timing. Round-number amounts and short deposit-to-claim intervals narrow the
set; unusual amounts narrow it further. Volume is the defence, and it is the same defence
every mixing construction has.

**Someone who obtains the link.** Can claim the funds. This is by design; see
[claim links](claim-links.md). The mitigation is operational — send links over channels you
trust, and use short expiries for links you expect to be redeemed quickly.

**The sender.** Knows the link key, so knows the claim. They cannot learn the recipient's
balance or history, only that their own claim was redeemed and by which address the note
was credited to.

**Xenia itself.** Has no server in either path. The claim page is static; state comes from
RPC reads against the escrow. There is nothing to subpoena.

## Practical guidance

- **Use uncommon amounts** where correlation matters. `100.00 STRK` at 14:02 followed by a
  `100.00 STRK` claim at 14:03 is a short guess.
- **Let time pass** between creating a link and having it claimed, when you can.
- **Use short expiries for links you send immediately**, so unredeemed links do not sit as
  distinguishable outstanding claims.
- **Do not fund a claimant's address directly** to help them cover fees. That publishes the
  exact sender → recipient edge Xenia removes. Pre-fund through the escrow instead — see
  [fees](fees.md).

## What Xenia does not claim

Amount privacy, and strong unlinkability at low volume. What it claims is identity
unlinkability that improves with adoption, over a shared escrow, with no server anywhere in
the path.
