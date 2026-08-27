---
title: Introduction
description: STRK20's bootstrapping deadlock, and the claim link that removes it.
order: 1
---

# Introduction

## The deadlock

STRK20 gives Starknet private balances. To hold one, an account must publish a viewing key
on-chain, and **only the account itself can publish its own key.** A sender cannot register
a recipient.

That single rule creates a deadlock. To receive private money you must already be a pool
user, and to become a pool user you must act first — before anyone has paid you anything,
and before you have any reason to. The SDK models it as a hard stop: `SetupRequirement.Register`
means the recipient has no viewing key, and the documented UX is to show the sender *"ask
them to register."*

Every private payments product on Starknet meets this wall. It is why the anonymity set
grows slowly: the protocol asks the newest, least-invested participant to move first.

## What Xenia does

Xenia turns the payment into a link.

The sender picks a token and an amount, and gets a URL. The recipient opens it, connects
any Starknet wallet, and claims. Registration happens inside the claim — the same atomic
transaction publishes their viewing key, opens their channels, and credits the note. They
never see the word "register."

```
shield  →  create claim  →  send a link  →  claimed
           (funds park in    (secret never    (register + credit a private
            XeniaEscrow)      touches a         note, one atomic transaction)
                              server)
```

The sender is never blocked by the recipient's state. That is the product.

## Why it is possible

A STRK20 transaction is a batch of actions grouped into ordered phases. A transaction may
skip phases but never go backwards:

| Phase | Action | Role in a claim |
|---|---|---|
| 0 | `SetViewingKey` | register the new user |
| 1 | `OpenChannel` | their self-channel |
| 2 | `OpenSubchannel` | the token's subchannel |
| 5 | `CreateOpenNote` | the note the claim credits |
| 7 | `InvokeExternal` | call `XeniaEscrow.privacy_invoke` |

Registration sits at phase 0 and the external invoke at phase 7. Because the phases run in
that order inside one transaction, a brand-new account can register itself and then be paid
before the transaction ends. Nothing in the protocol had to change; the ordering was always
there.

At most one external invoke is permitted per transaction, so creating a claim and claiming
it are always two transactions. They are two separate user actions anyway.

## What you get

- **A link, not an address.** Send it over WhatsApp, Telegram, anywhere. The secret lives
  in the URL fragment and never reaches a server.
- **No onboarding step.** The recipient's first pool transaction is the one that pays them.
- **Expiry and refund.** An unclaimed link can be swept back by the sender after it expires.
- **No backend.** Claim state is read from contract events and a single view call.

## Where to go next

- [Quickstart](quickstart.md) — send and claim a payment.
- [Privacy model](concepts/privacy-model.md) — exactly what Xenia hides.
- [The escrow contract](integrate/escrow-contract.md) — build on `XeniaEscrow` yourself.
