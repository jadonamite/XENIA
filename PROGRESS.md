# Xenia — Progress

**Deadline: Aug 31, 23:59 UTC.** Nothing to submit — whatever the repo shows at that moment is the entry.

Today is **Aug 26**. **5 days.**

## Where it stands

**Contract and chain (Sam) — done.**

| | |
|---|---|
| `XeniaEscrow` | 26 tests green in CI |
| Mainnet | `0x257082062a074eb79575b859c9b3aadd40a986501223928121b5a1f56627095` |
| Sepolia | `0x7d01c97a95ddc117ac63be7a6ab4b042d87d8a70c1cadbdb1f4c1f88b68094e` |
| `strk20.json` | `contracts` filled |
| Deployer | 15.99 STRK left for the demo transactions |

Tests cover the escrow's logic, cross-language agreement with the client's JavaScript (a real
browser signature verifying in Cairo), and the full lifecycle driven through a mock pool using the
exact flat calldata the client will send.

**Client (Jadon) — blocked, and unaware.** Four defects in `contracts/CLIENT-FIXES.md`; nothing
transacts until they land. Two of them are the PRD's fault, since §5.1/§5.2 showed six calldata
elements against a ten-parameter entrypoint. Both now corrected.

**The three mainnet transactions — not started.** They are the pass/fail requirement and they run
entirely through the client. Because `contracts` is now non-empty, they must be **create-claim,
claim and refund**; a plain shield does not count.

**Still unproven:** whether Ready folds registration into our claim shape. Needs a browser, a
working client, and the untouched Sepolia account.

---

## Roles

Split by system boundary so neither person blocks the other after Day 1.

### Role A — Contract & Chain · **Sam**

- `XeniaEscrow` Cairo contract: deposit / claim / refund, expiry, access control
- Contract tests, testnet deploy, mainnet deploy
- Pool integration: action lists, calldata shape, `strk20PrepareInvoke` dry runs
- Producing the three mainnet transactions, filling `strk20.json`
- Owns the Telegram escalation path

### Role B — Client & Delivery · **Teammate**

- Fork the STRK20 starter kit, strip to our three pages
- Secret generation, commitment hashing, link + QR building
- Create-claim page, claim page, my-claims/refund page
- Vercel deploy, repo Website field, `demo_url`
- README, leak table, license, 3-minute demo video

**Interface frozen Day 1:** the `privacy_invoke` signature and calldata order go in `contracts/INTERFACE.md` and do not change after Day 1. Role B builds against it with a stub helper on testnet.

**Swap condition:** if your teammate is stronger in Cairo, swap A and B wholesale — never split the contract across two people. Decide by end of Day 1 and log it.

---

## Day 0 — Aug 23 (today)

- [ ] **Sam** — post the Day 0 verification list (ARCHITECTURE.md §10) in the STRK20 Telegram group. The action-list question for a helper returning an empty span is the one real unknown.
- [ ] **Sam** — `npx skills add starkience/strk20-agent-skills` (the official integration skill) and read the anonymizer anatomy + escrow pages end to end
- [ ] **Sam** — Day 0 walkthrough: shield a real balance on mainnet
- [ ] **Sam** — confirm mainnet pool address and a live token to use
- [ ] **Teammate** — clone the starter kit, run it, connect a wallet. Pin `starknet@^10.4.0` from `next` — this is where the first hour goes if you skip it
- [ ] Public repo, MIT license, first commit, push
- [ ] `registry.json` PR: repo URL, both Telegram handles, `category: "Payments"`, `inspired_by` the escrow/payments idea. Auto-merges, nothing needs deploying. **Do this today.**
- [ ] Repo description (it becomes the public one-liner) + Website field

## Day 1 — Aug 24

- [ ] **Sam** — `XeniaEscrow` compiling; deposit + claim paths from the reference escrow, plus expiry/refund fields
- [ ] **Sam** — freeze `contracts/INTERFACE.md`
- [ ] **Teammate** — starter kit stripped to our pages; secret generation + commitment hashing working in-browser
- [ ] **Both** — role swap decision logged

## Day 2 — Aug 25

- [ ] **Sam** — contract tests: claim succeeds once, second claim reverts, refund blocked before expiry, non-pool caller rejected
- [ ] **Sam** — deploy to testnet
- [ ] **Teammate** — create-claim page produces a real link + QR
- [ ] **Teammate** — claim page reads the secret from the URL fragment

## Day 3 — Aug 26 — **first end-to-end on testnet**

- [ ] **Sam** — create-claim transaction lands on testnet
- [ ] **Sam** — claim transaction lands, open note credited
- [ ] **Both** — **the critical test: claim from a wallet that has never registered.** This is the entire thesis. If `autoRegister` doesn't fold in as expected, you need to know today.

> **Checkpoint.** If registration won't bundle into the claim, fall back to a two-step claim (register, then claim) and keep shipping. Worse UX, same core value, still the only product filling this gap.

## Day 4 — Aug 27 — **mainnet**

- [ ] **Sam** — `XeniaEscrow` deployed to mainnet, address in `strk20.json`
- [ ] **Sam** — transaction 1 (shield) and 2 (create claim), hashes recorded
- [ ] **Teammate** — live on Vercel, Website field set
- [ ] **Sam** — post the contract + claim-link pattern in the Telegram group and offer it to other teams. Every payments project in that leaderboard hits the registration wall — this is the day to be useful to them, while they still have time to integrate

## Day 5 — Aug 28 — **the money shot**

- [ ] **Sam** — transaction 3: claim on mainnet from a fresh, never-registered wallet
- [ ] **Sam** — three hashes in `strk20.json`, verified on a block explorer
- [ ] **Both** — screenshots: the claimer's address before (no registration) and after (registered, holding a private note)
- [ ] **Teammate** — refund path working end to end

> **Hard gate.** Three verified mainnet hashes by end of Day 5. Everything below is polish and gets cut before this does.

## Day 6 — Aug 29 — docs

- [ ] **Teammate** — README a stranger can follow
- [ ] **Teammate** — leak table (ARCHITECTURE.md §7) in the README, including the bearer-instrument warning
- [ ] **Teammate** — "how to reuse this escrow in your own app" section — this is what earns the dependency bonus
- [ ] **Sam** — Cairo commented; note in the README what we changed from StarkWare's reference and why
- [ ] **Sam** — error paths: expired claim, already claimed, wrong secret, wallet without STRK20 support

## Day 7 — Aug 30 — video

- [ ] **Teammate** — 3-minute video: 40s on the registration deadlock, 90s live mainnet send-and-claim from a fresh wallet, 30s explorer proof, 20s on what leaks
- [ ] `demo_video` and `demo_url` in `strk20.json`
- [ ] **Both** — someone outside the team claims a link cold, with no help

## Day 8 — Aug 31 — buffer

Treat **Aug 30, 23:59** as the real deadline so this day is spare.

- [ ] `strk20.json`: 3+ transactions, contracts, video, demo URL
- [ ] Hub shows nothing missing
- [ ] License present, repo public, README renders
- [ ] Final push well before 23:59 UTC — the hub scrapes every 30 minutes

---

## Submission checklist

- [ ] Repo public, open-source, licensed
- [ ] `registry.json` PR merged, visible on the hub
- [ ] `strk20.json` with ≥3 mainnet hashes, each touching the pool, two through `XeniaEscrow`
- [ ] Live demo URL, no login wall
- [ ] 3-minute demo video
- [ ] Contract addresses listed
- [ ] README a stranger can follow

---

## Risk register

| Risk | Likelihood | Response |
|---|---|---|
| Wallet API can't express the deposit leg for an empty-span helper | Med | Day 0 question; fall back to SDK route for the sender side |
| Wallet doesn't auto-register a new user mid-claim | Med | Two-step claim (Day 3 checkpoint). Degraded, not fatal |
| Cairo learning curve | Med | The reference escrow is working code. Change as little as possible — expiry, refund, access control, nothing else |
| Another team ships claim links too | Low–Med | Ideas aren't exclusive. Differentiate on expiry/refund, docs, and reusability |
| Mainnet transactions left late | High if unmanaged | Day 5 hard gate |
| Claim amounts are public and read as "not private" | Med | Address it head-on in the video. Open-note amounts are plaintext by protocol design; the *link* between sender and recipient is what's hidden |

---

## Decision log

- **Aug 23** — Kharon abandoned. Its premise (nobody can pay gas for an unshield) was wrong: paymaster relaying is first-class in STRK20 and AVNU already ships it. Verified against the docs before committing.
- **Aug 23** — Xenia chosen: claim-link payments to unregistered recipients. StarkWare documented the gap and published an explicitly unofficial, unaudited sketch with no SDK support. Phase ordering confirms register-and-claim fits in one transaction.
- **Aug 23** — Roles: Sam on contract + chain, teammate on client + delivery.

- **Aug 24** — Contract scaffolded against the frozen §4.1 interface. `sncast` and `snforge` have
  no Windows binaries and will not build here, so tests run in CI and deploys go through a
  starknet.js script instead.
- **Aug 25** — Sepolia rehearsal. It caught four things that would each have cost a mainnet
  attempt: starknet.js v10 replaced the positional `Account` constructor, Argent v0.4 rejects a
  bare `[r, s]`, an account with a guardian cannot be scripted at all, and several public RPCs are
  dead or fail on `estimateFee`.
- **Aug 25** — §4.4.6's refund check found unimplementable: `privacy_invoke` is always called by
  the pool, so `get_caller_address()` can never be the sender. Refund is authorised by a signature
  under its own domain tag instead.
- **Aug 25** — Answered the open questions by measuring mainnet rather than waiting: registration
  does bundle but only alongside a deposit; the fee is relayer-fronted and reclaimed from the pool;
  a dapp can register a user itself via `apply_actions`; sponsorship is used by nobody, 0 of 18.
- **Aug 25** — The pool's balance invariant makes a zero-balance claim impossible at the protocol
  level, not the wallet level. `XeniaEscrow` gained opt-in pre-funding, paid out of the escrow
  rather than the sender's address so no sender-to-recipient edge appears on chain. Two Deposit
  parameters that were already zero carry it, so the calldata shape did not move.
- **Aug 26** — Deployed to mainnet and verified on chain. Cost ~10.3 STRK; the declare reserves a
  ceiling near 21 before it will run.
