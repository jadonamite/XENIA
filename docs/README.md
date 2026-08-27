---
title: Xenia Documentation
description: Send private money on Starknet to someone who has never used the privacy pool.
---

# Xenia Documentation

Xenia is a claim link for private payments on Starknet. The sender picks a token and an
amount and gets a URL. The recipient opens it, connects a wallet, and claims — becoming a
registered STRK20 pool user in the same transaction that pays them.

This is the full documentation set. It is written to be read in order, and each page is
self-contained enough to be linked to on its own.

## Start here

| Page | For |
|---|---|
| [Introduction](introduction.md) | What Xenia is and the problem it removes |
| [Quickstart](quickstart.md) | Send and claim your first payment |

## Concepts

| Page | For |
|---|---|
| [STRK20 in five minutes](concepts/strk20.md) | Notes, channels, phases, action lists |
| [Claim links](concepts/claim-links.md) | Link keys, commitments, bearer semantics |
| [Privacy model](concepts/privacy-model.md) | What is hidden, what leaks, threat model |
| [Fees](concepts/fees.md) | The pool fee, who pays it, and how it is settled |

## Guides

| Page | For |
|---|---|
| [Send a payment](guides/send.md) | Creating a claim |
| [Claim a payment](guides/claim.md) | Redeeming a link |
| [Refund a payment](guides/refund.md) | Reclaiming an expired link |

## Integrate

`XeniaEscrow` is deployed, tested and MIT-licensed, and nothing about it is
Xenia-specific. If you are building on STRK20 you will hit the same registration wall.
Use ours, or fork it.

| Page | For |
|---|---|
| [The escrow contract](integrate/escrow-contract.md) | Entry point, calldata, events, errors |
| [Action lists](integrate/action-lists.md) | The STRK20 batches for each operation |
| [Link keys and signatures](integrate/signatures.md) | Hashing and signing, with test vectors |
| [Client library](integrate/client-library.md) | The TypeScript helpers in `src/lib/xenia` |

## Reference

| Page | For |
|---|---|
| [Deployments](reference/deployments.md) | Addresses, class hashes, networks |
| [Configuration](reference/configuration.md) | Environment variables and constants |
| [Errors](reference/errors.md) | Every revert reason and what causes it |

## Repository

Source, contracts and tests: [github.com/jadonamite/XENIA](https://github.com/jadonamite/XENIA).
Licensed [MIT](../LICENSE).
