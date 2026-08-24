# Xenia

**Pay someone privately who has never touched the privacy pool.** They claim from a link, and
registration happens inside the claim.

STRK20 Private Sprint · Starknet mainnet · [Architecture](ARCHITECTURE.md) · [Progress](PROGRESS.md)

## The problem

STRK20 has a bootstrapping deadlock. An account must publish a viewing key on-chain before it can
receive private balances, and **only the recipient can publish their own key** — a sender cannot do
it for them. The SDK models this as a hard stop, and the documented UX is to show the sender
"ask them to register."

So to receive private money you must already be a pool user. Every private payments product on
Starknet hits this wall, and it is why the anonymity set grows slowly: onboarding requires the new
user to act first, before they have any reason to.

## What Xenia does

A claim link. The sender picks a token and an amount and gets a URL. The recipient opens it,
connects a wallet, and claims — becoming a registered pool user in the same transaction that pays
them. They never see the word "register."

```
shield  →  create claim  →  send a link  →  claimed
           (funds park in    (secret never    (register + credit a private
            XeniaEscrow)      touches a         note, one atomic transaction)
                              server)
```

Unclaimed funds return to the sender after an expiry.

## How it works

STRK20 transactions are batches of actions grouped into ordered phases. A transaction may skip
phases but never go backwards:

| Phase | Action | Role in a claim |
|---|---|---|
| 0 | `SetViewingKey` | register the new user |
| 1 | `OpenChannel` | their self-channel |
| 2 | `OpenSubchannel` | the token's subchannel |
| 5 | `CreateOpenNote` | the note the claim credits |
| 7 | `InvokeExternal` | call `XeniaEscrow.privacy_invoke` |

Registration sits at phase 0 and the external invoke at phase 7, so a brand-new account can
register and claim in a single atomic transaction. That ordering is the whole product.

`XeniaEscrow` is an anonymizer contract. Creating a claim withdraws from the pool to the escrow and
records a commitment; the escrow returns an empty span, because the tokens have already moved.
Claiming recomputes the commitment from the secret, approves the pool to pull, and returns an
`OpenNoteDeposit` that credits the recipient's open note.

## What leaks

Xenia hides who paid whom. It does not hide everything, and the difference matters.

| Leak | Status |
|---|---|
| Recipient identity, recipient's balance | Hidden |
| Link between sender and recipient | Hidden — no direct on-chain edge |
| Escrow deposit (pool → helper transfer) | **Public.** Observers see the pool paid the helper, not who initiated it |
| Claim amount | **Public.** Open-note amounts are plaintext by design — measured at execution |
| Sender's original shield | Public leg, as always |
| Timing correlation between deposit and claim | Not addressed |
| Anyone holding the link | Can claim. It is a bearer instrument |
| The secret, once a claim is submitted | Appears in transaction calldata. A claim seen before inclusion can in principle be replayed |

The last two rows are properties of the design, not defects to be fixed later. **Treat a claim link
like cash:** anyone you send it to, and anyone they forward it to, can spend it. A lost link cannot
be recovered — only refunded after expiry, by the sender.

## Credit

The escrow pattern starts from the [reference escrow helper](https://strk20-by-example.org/helpers/escrow)
published on STRK20 by Example. That reference parks funds behind a hashed secret and stops there.
Xenia adds expiry and refund, folds registration into the claim, and emits events for every state
change.

## Licence

[MIT](LICENSE).
