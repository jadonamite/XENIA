# What mainnet actually does — measured, 2026-08-25

Three questions were sitting with support. Two of them turned out to be answerable by reading
mainnet itself, and the answers are better than the guidance suggested. Method: pull every
`ViewingKeySet` event the pool has emitted, fetch each transaction, and look at what else happened
inside it.

Pool `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`, last 50 000 blocks,
12 registrations found.

---

## 1. Registration DOES bundle into a larger transaction — with a deposit

Of the registrations examined, the split is clean:

| Shape | Count |
|---|---|
| `ViewingKeySet + Deposit + EncNoteCreated + Withdrawal` | 5 |
| `ViewingKeySet` alone | 3 |

**Every bundled registration rides alongside a `Deposit`. Not one is a pure receive.**

So the protocol and the wallets both permit folding registration into a real transaction — that is
settled, and it is happening in production today. What remains unproven is Xenia's exact shape:
`transfer("OPEN") + invoke` with **no** deposit. No such transaction exists on mainnet to point at.

This is exactly the (a)/(b) distinction we put to support, and the evidence says (a) works.

## 2. The fee is paid publicly by a relayer, then reclaimed from the pool

Traced through `0x15788481aee3…`, following every STRK transfer:

```
6.0000  relayer  → paymaster        (relayer fronts the fee)
6.0000  paymaster → fee_collector   ← the 6 STRK pool fee
8.0000  user     → pool             ← the user's deposit
6.0000  pool     → paymaster        ← the pool reimburses the relayer
```

The transaction's `sender_address` is a relayer, not the user, which is why the claimant needs no
public STRK and no allowance — support was right about that.

**But the reimbursement comes out of the pool.** In this transaction the user deposited 8 STRK and
6 went straight back out as the fee, netting 2. That is what "may still need private balance for
the fee quote" means in practice: *something* must fund that outbound 6 STRK.

For a first-time claimant with nothing inside the pool, this is the open risk — and it is the
reason the deposit-bundling workaround matters, because a deposit in the same transaction is
demonstrably enough to cover it.

Live values: `get_fee_amount()` = **6 STRK**, `fee_collector` =
`0xd79041634625e5288296fbc648088788710ba44903a3a49468a66567749e77`.

## 3. A dapp can drive registration itself — no wallet menus

The standalone registrations are plain `INVOKE` v3 transactions with **one call, straight to the
pool**, on selector `0x246333a7…` — which is `apply_actions`.

That is a public entrypoint. Registration is not locked inside a wallet's private UI.

Combined with MAINNET-DAY-0's note that the viewing key derivation only needs `signMessage`
("your wallet needs no STRK20 support for this"), the conclusion is:

**Our claim page can register the user itself, with any Starknet wallet.** The fallback is two
clicks on our page, not "go into your wallet's settings and come back" — which was the difference
that mattered most for the product.

---

## What this changes

- **The two-step fallback is now acceptable**, not embarrassing. Same page, two prompts.
- **Bundling a small self-deposit into the claim is an evidence-backed workaround** for both the
  registration and the fee problem at once. That precise shape is running on mainnet today.
- **The remaining unknown narrows sharply**: does a *pure receive* — no deposit — fold in
  registration and fund the fee? Nothing on-chain answers that, because nobody has done it. Only
  our own probe or support can.

## Confidence

Items 1–3 are measured from mainnet, not inferred from documentation. The sample is small
(12 registrations, 6 transactions inspected in full) and drawn from one 50 000-block window, so
treat the *counts* as indicative. The *existence* proofs — registration bundles, the pool
reimburses the fee, `apply_actions` is directly callable — need only one example each, and each
has several.

---

# 4. A zero-balance claimant cannot pay the fee in a pure receive — from the pool's own rules

The remaining question split into a wallet half (does Ready emit phase 0 for a pure receive?) and
a protocol half (can a zero-balance account pay the fee at all?). The protocol half is decidable
without a browser, and the answer is no.

**The balance invariant.** Every pool transaction tracks a per-token running balance across its
client actions:

| Action | Effect |
|---|---|
| `deposit` | add |
| `use_note` (spend an existing note) | add |
| `withdraw` | subtract |
| `create_enc_note` / `create_open_note` | subtract |

`subtract_balance` uses `checked_sub` and panics `NEGATIVE_INTERMEDIATE_BALANCE`; at the end
`assert_valid` requires **every token to net exactly zero**, or `FINAL_BALANCE_MUST_BE_ZERO`.

The mainnet transaction traced above fits exactly: `+8` deposit, `−2` note, `−6` fee = 0.

**`invoke_external` has no balance effect.** It only emits `ServerAction::Invoke`; the escrow's
returned `OpenNoteDeposit` is applied server-side, outside this accounting.

So Xenia's claim, for a first-time user, is:

```
create_open_note (zero-value)   −0
invoke_external                  no effect
withdraw 6 STRK   (the fee)     −6
                                ────
inflows                           0     →  checked_sub(0, 6) panics
```

**The fee withdrawal has nothing to balance against.** This is not Ready being incomplete — the
pool would reject the transaction whatever wallet built it.

## What that leaves

Two ways a claim can work, and only two:

1. **Sponsorship.** If the relayer absorbs the fee without reclaiming it, there is no `withdraw`
   action at all and the invariant holds trivially (0 = 0). Support's phrasing — "unless the flow
   is sponsored" — implies this exists. Whether it can be turned on for our claim is now **the
   single question worth asking.**
2. **Bundle a deposit** of at least the fee into the claim. That supplies the inflow, and it is the
   exact shape already running on mainnet (`ViewingKeySet + Deposit + … + Withdrawal`). Cost: the
   claimant needs ~6 STRK of *public* STRK, which weakens "arrives with nothing" but is far more
   tractable than needing private balance.

Option 2 is the fallback we can build without anyone's permission. Option 1 is strictly better if
available.

**Confidence:** derived from the pool's source and consistent with every mainnet transaction
observed. What is *not* established is whether sponsorship can suppress the fee withdrawal for our
flow — that is a policy question, not a code one.

---

# 5. Sponsorship is not observed anywhere — measured

Option 1 (a sponsored claim, emitting no fee withdrawal) was tested by classifying real pool
transactions. For each: does it emit `Withdrawal`, and who sent the 6 STRK to the fee collector?

- `SELF_PAID` — no withdrawal, fee paid publicly by the submitter
- `RELAYER_REIMBURSED` — withdrawal present, fee fronted by someone other than the user
- `SPONSORED` — no withdrawal, and the fee paid by a third party

Sample of 18 transactions carrying `Deposit` or `OpenNoteCreated`, drawn from the last 40 000
blocks:

```
SELF_PAID: 0    RELAYER_REIMBURSED: 18    SPONSORED: 0    NO_FEE_SEEN: 0
```

Adding the three standalone registrations examined earlier, the pattern is consistent:

| Transaction | Submitter | Fee paid by | Withdrawal? |
|---|---|---|---|
| Registration alone | the user | the user, publicly | no |
| Anything with notes or deposits | a relayer | relayer, reimbursed from the pool | **yes** |

**Every note-bearing transaction goes through a relayer and reimburses out of the pool.** A claim is
note-bearing. So the reimbursement withdrawal is not optional in practice, and it is what needs an
inflow to balance against.

**Conclusion: do not plan around sponsorship.** Nothing on mainnet is using it. If it exists it is a
private arrangement, which makes it a question for the organisers rather than something we can
switch on. Option 2 — bundling a deposit that covers the fee — is the only path demonstrated to
work, and all 18 of those transactions are examples of it.

A third path exists but does not generalise: paying the fee publicly from the user's own account,
as the standalone registrations do. It requires a standing STRK allowance to the pool and, more
importantly, was never observed on a note-bearing transaction — plausibly because those go through
the proving and relayer infrastructure. Worth one probe, but not worth designing around.

---

# 6. Private receipt requires registration — enforced by the pool, not the wallet

The wallet's `NOT_REGISTERED` left an obvious question: is that Ready declining, or the protocol? A
wallet's refusal might be routed around; the chain's cannot. It is the chain's.

`privacy.cairo`, in `open_channel`:

```cairo
// Assert sender is registered with the given private key.
let sender_public_key = self.public_key.read(sender_addr);
assert(sender_public_key.is_non_zero(), errors::SENDER_NOT_REGISTERED);
...
// Assert recipient is registered.
let recipient_public_key = self.public_key.read(recipient_addr);
assert(recipient_public_key.is_non_zero(), errors::RECIPIENT_NOT_REGISTERED);
```

A private note travels over a channel, and a channel cannot be opened to an address with no viewing
key published. The assert is unconditional, in the contract deployed on mainnet, and there is no
alternative entry point that skips it. Both ends are covered, which is also why a sender must
register before shielding.

**Note the wallet stopped us first.** The pool's errors are `SENDER_NOT_REGISTERED` and
`RECIPIENT_NOT_REGISTERED`; what Ready showed was a plain `NOT_REGISTERED` of its own. So we never
actually reached the pool's check — but reaching it would only have produced a reverted transaction
and a wasted fee.

**Consequence for Xenia.** No amount of client work makes private receipt reachable for a
first-time recipient, because only they can publish their own viewing key and only the pool can
accept it. `claim_public` exists because of this: it pays them in plain ERC-20, outside the pool,
which is the one thing that needs nothing of them. Proven on mainnet in
`0x2b7877d75e7a52317cdfa793d696d4d2f84c466fbaee3d8ca138ae5252dcf64`, submitted by our relayer, with
the recipient signing nothing and holding nothing.
