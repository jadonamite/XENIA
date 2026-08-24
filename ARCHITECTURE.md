# Xenia — Architecture

**Pay someone privately who has never touched the privacy pool. They claim from a link, and registration happens inside the claim.**

STRK20 Private Sprint · Aug 14–31 2026 · Team of 2

---

## 1. The problem

STRK20 has a bootstrapping deadlock at the protocol level.

An account must register a viewing key before it can receive private balances, and **only the recipient can publish their own key** — the sender cannot do it for them. The SDK models this as a hard stop: `SetupRequirement.Register` means the recipient has no viewing key on-chain, and the documented UX is to show "ask them to register."

So to receive private money you must already be a pool user. Every private payments product on Starknet hits this wall, and it is the reason the pool's anonymity set grows slowly: onboarding requires the new user to act first, before they have any reason to.

**StarkWare's answer is a sketch, not a product.** The escrow helper on their docs site parks funds behind a hashed secret so an unregistered recipient can claim later. They label it explicitly: not shipped in the `starknet-privacy` monorepo, no SDK helper functions, unofficial, and neither reviewed nor audited by StarkWare. It's a worked illustration of the pattern, published so someone will build the real thing.

That is what we build.

## 2. What we build

A claim link. Sender picks a token and amount, gets a URL, sends it over WhatsApp or Telegram. Recipient opens it, connects any Starknet wallet, and claims — becoming a registered pool user in the same transaction that pays them.

What we add over the reference sketch:

- **Expiry and refund** — unclaimed funds return to the sender. The reference escrow has no expiry, so a lost link means permanently stranded tokens.
- **Registration folded into the claim** — the recipient never sees a "register first" step.
- **Real link UX** — secret in the URL fragment, QR code, claim status, clear warnings.
- **A README and a license**, so the next team can actually use it.

### Non-goals

- Multi-recipient batches
- Recovery of a lost link (impossible by construction — say so plainly)
- Anything depending on **confidential compute**. Sub-accounts are *not* needed here.
- Fiat on-ramp, phone-number identity, notification service

---

## 3. Why this is legal in one transaction

This is the load-bearing detail, and it's what makes Xenia buildable in a week.

Pool transactions are batches of client actions grouped into ordered phases. A transaction may skip phases but never go backwards:

| Phase | Action | Used by our claim |
|---|---|---|
| 0 | `SetViewingKey` | register the new user |
| 1 | `OpenChannel` | their self-channel |
| 2 | `OpenSubchannel` | the token's subchannel |
| 5 | `CreateOpenNote` | the note the claim credits |
| 7 | `InvokeExternal` | call `XeniaEscrow.privacy_invoke` |

Registration sits at phase 0, the external invoke at phase 7. **A brand-new account can register and claim in a single atomic transaction.**

The SDK exposes this as `build({ autoRegister: true, autoSetup: true })` — `autoRegister` bundles registration when the account has no on-chain viewing key and is a no-op when it does; their docs name a claim page as the case it exists for. `autoSetup` opens the missing channel and subchannel.

At most **one external invoke per transaction**, so creating a claim and claiming it are always separate transactions. That's fine — they're separate user actions anyway.

---

## 4. Flows

### Create a claim (sender)

```
client                          chain
──────                          ─────
generate secret (random felt)
commitment = poseidon(
   XENIA_COMMITMENT_TAG, secret)
                          ──►   pool withdraws `amount` to XeniaEscrow
                                pool calls privacy_invoke(Deposit, ...)
                                escrow stores { token, amount, expiry,
                                                refund_to, claimed:false }
                                escrow returns EMPTY span (funds park)
build link:
  https://xenia.app/c#<secret>
```

The secret **never touches the chain or our server** — only its hash does, and it lives in the URL fragment, which browsers do not send to servers.

### Claim (recipient — possibly brand new)

```
recipient opens link, connects wallet
                          ──►   one STRK20 transaction:
                                  phase 0  register (autoRegister)
                                  phase 1  open self-channel
                                  phase 2  open token subchannel
                                  phase 5  create open note  ← transfer amount "OPEN"
                                  phase 7  invoke XeniaEscrow(Claim, secret,
                                             note_id = ${openNoteIds[0]})

                                escrow recomputes hash from the secret,
                                checks not claimed / not expired,
                                marks claimed, approves the pool to pull,
                                returns OpenNoteDeposit
                                pool credits the open note
```

The recipient now holds a private note and is a registered pool user. They never saw the word "register."

### Refund (sender, after expiry)

Same shape as claim, authorized by `refund_to` matching the caller's intended recipient and `expiry` having passed. The escrow returns an `OpenNoteDeposit` crediting the sender's own open note.

---

## 5. Contract — `XeniaEscrow`

Extends the documented reference escrow. Sketch, not final — read the anonymizer anatomy and escrow pages again before implementing.

```cairo
#[derive(Serde, Copy, Drop, PartialEq, Debug, starknet::Store)]
pub struct ClaimEntry {
    pub token:     ContractAddress,
    pub amount:    u128,
    pub expiry:    u64,              // block timestamp
    pub refund_to: ContractAddress,  // who may reclaim after expiry
    pub claimed:   bool,
}

#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub enum XeniaOperation { Deposit, Claim, Refund }
```

Invariants:

1. `privacy_invoke` **asserts the caller is the privacy pool** — the reference escrow does this and it is non-negotiable; nobody drives the escrow directly.
2. Deposit returns an **empty span**. Tokens stay parked; there is nothing to credit yet.
3. Claim recomputes the commitment **from the secret preimage** and ignores any passed-in hash.
4. `claimed` flips exactly once. A second claim reverts.
5. Refund requires `expiry` passed **and** `refund_to` to match; refund and claim are mutually exclusive by the same flag.
6. Domain-separated commitment tag, so our hashes cannot collide with anything else.
7. The escrow **approves** the pool to pull — it never transfers directly. This is the documented rule of the pattern.

---

## 6. Client

Fork the STRK20 starter kit — it already ships the wallet picker, shield/unshield/private transfer, shielded balances, and a deployable `privacy_invoke` helper. Swap its demo defaults for our token and helper.

Route: **Starknet Wallet API** via `starknet.js`. The wallet holds the viewing key, discovers notes, proves, and submits — our app never touches key material. A private call is `transfer` with amount `"OPEN"` plus an `invoke` naming our helper, with `${openNoteIds[0]}` resolving to the note opened in the same transaction.

Pages: create-claim, claim (the whole product), my-claims (status + refund).

**Dry-run everything with `strk20PrepareInvoke`** — it builds and proves without submitting, which their docs call the cheapest way to catch a calldata-shape mistake. Our calldata order must match `privacy_invoke`'s signature exactly, because the pool deserializes it straight into those parameters.

---

## 7. What leaks

Put this table in the README verbatim.

| Leak | Status |
|---|---|
| Recipient identity, recipient's balance | Hidden |
| Link between sender and recipient | Hidden — no direct on-chain edge |
| Escrow deposit (pool → helper transfer) | **Public.** Observers see the pool paid the helper, not who initiated it |
| Claim amount | **Public.** Open-note amounts are plaintext by design — measured at execution |
| Sender's original shield | Public leg, as always |
| Timing correlation between deposit and claim | Not addressed. Warn in the UI |
| Anyone holding the link | Can claim. It is a bearer instrument |

That last row is a product property, not a bug — but it must be stated in the UI, not buried. Treat the link like cash.

---

## 8. Three mainnet transactions

All three touch the pool; the last two run through `XeniaEscrow`, satisfying the sprint's on-chain check.

1. **Shield** — sender deposits into the pool
2. **Create claim** — invoke `XeniaEscrow` (Deposit), funds park in the helper
3. **Claim** — from a genuinely fresh wallet: register + claim in one transaction

Transaction 3 is the demo. Film it from a wallet that has never registered, and show the block explorer before and after.

---

## 9. Environment gotchas that will cost a day if missed

- **`starknet@^10.4.0`, from the npm `next` tag.** A bare install resolves to 10.0.x, which has none of the STRK20 API — `WalletAccountV6`, `strk20InvokeTransaction` and `STRK20_ACTION` will all be missing. Wallet API `>= 0.10.3` required.
- **The SDK 404s on npm.** It's on GitHub Packages and needs a token even though it's public, or install straight from git at a commit. Node >= 24.
- If we touch the SDK route: `provingBlockId = currentBlock - 10`, `tip: 0n` is mandatory, and `proofDetails` must be **omitted entirely** rather than passed empty — an empty `proofFacts` array serializes an invalid v3 transaction.
- Notes mature **10 blocks** after creation. The claimed note isn't spendable immediately.
- The viewing key must be a **bigint**; a hex string silently derives wrong channel keys.
- After any failed submission, call `invalidateProofNonceCache()` before retrying.
- Deposits are screened by FPI and the pool verifies the signature on-chain. Our claim is not a deposit, but the sender's shield is.
- The pool address in the docs is **Sepolia**. Confirm mainnet separately.

---

## 10. Day 0 verification — resolve before writing Cairo

- [ ] **How is the withdraw leg to the helper expressed in the Wallet API action list** when the helper returns an empty span and no open note is created? The swap example always pairs a `"OPEN"` transfer with the invoke; our deposit path has no output note. **This is the one thing I could not confirm from the docs.** Ask in the Telegram group.
- [ ] Does the connected wallet auto-register a brand-new user on `strk20InvokeTransaction`, or do we need an explicit register action / the SDK route for the claim?
- [ ] Mainnet pool address, and which tokens are live on it
- [ ] Cost of a claim transaction in STRK (sets whether tiny claims are viable)
- [ ] Does the pool reject an invoke whose helper returns an empty span in a transaction that has no other outputs?

**Kill condition:** none of these should be fatal — the escrow pattern is documented working code. If the Wallet API can't express the deposit leg, fall back to the SDK route with an app-held account for the sender side. Establish which by end of Day 0.
