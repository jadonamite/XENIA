# Xenia — Product Requirements

Read this before writing contract or client code. [`ARCHITECTURE.md`](ARCHITECTURE.md) explains
why the design works; this document says what must be built and what "done" means.

The interface in §4 is frozen. Both sides build against it independently.

---

## 1. Product

Pay someone privately who has never touched the privacy pool. The sender creates a claim link; the
recipient opens it, connects a wallet, and claims. Registration happens inside the claim
transaction, so the recipient becomes a pool user in the same transaction that pays them.

One sentence for the video, the README and the Telegram group:

> Every other private payment link on this leaderboard needs the recipient to already be a pool
> user. Xenia doesn't.

That is the differentiator and the only one that survives contact with the competition. Expiry and
refund are table stakes — `redpacket` already ships them. Link UX and QR codes are commodity. Do
not lead with either.

## 2. Scope

**In:**

- `XeniaEscrow` anonymizer contract: deposit, claim, refund, expiry, event emission
- Create-claim, claim, and my-claims/refund pages
- Three mainnet transactions, the third from an account that has never registered
- README, leak table, licence, 3-minute video

**Out:** multi-recipient batches, recovery of a lost link, sub-accounts and confidential compute,
fiat on-ramp, phone-number identity, notifications.

## 3. Acceptance criteria

The panel scores 30% integration depth, 30% working mainnet product, 25% innovation, 15% docs.
The mainnet weight is mechanical and most of the field fails it. It comes first.

`strk20.json` must contain, before **31 August 23:59 UTC**:

| Field | Requirement |
|---|---|
| `transactions` | ≥3 mainnet hashes. Each must exist, have succeeded, and have touched the STRK20 pool |
| `contracts` | `XeniaEscrow`'s mainnet address |
| `demo_url` | Public, no login wall |
| `demo_video` | 3 minutes |

The three transactions:

1. **Shield** — sender deposits into the pool
2. **Create claim** — invokes `XeniaEscrow`, funds park in the helper
3. **Claim** — from an account that has never registered: register and claim, one transaction

> **Listing a contract raises the bar on every transaction.** The sprint validator requires that if
> `contracts` is non-empty, each listed transaction must also carry an **event emitted by one of
> those contracts**. Touching the pool through someone else's contract does not count as your
> project running on mainnet.
>
> **`XeniaEscrow` must therefore emit an event on every state-changing path.** The reference escrow
> emits nothing. A straight port would produce three valid-looking transactions that fail
> validation and score as if we never shipped. This is not optional and it is not polish — see §4.3.

## 4. Contract — `XeniaEscrow`

Starts from the [reference escrow helper](https://strk20-by-example.org/helpers/escrow). Change as
little as possible beyond what is specified here.

### 4.1 Frozen interface

```cairo
#[derive(Serde, Copy, Drop, PartialEq, Debug)]
pub enum XeniaOperation {
    Deposit,
    Claim,
    Refund,
}

fn privacy_invoke(
    ref self: ContractState,
    operation: XeniaOperation,
    key: felt252,                 // Deposit: the commitment, computed client-side.
                                  // Claim/Refund: the link public key `pk`; the contract
                                  // recomputes poseidon(TAG, pk) and looks that up.
    token: ContractAddress,       // Deposit only
    amount: u128,                 // Deposit only
    expiry: u64,                  // Deposit only — absolute block timestamp
    refund_to: ContractAddress,   // Deposit only
    claimant: ContractAddress,    // Claim only — the address the signature authorises
    sig_r: felt252,               // Claim only
    sig_s: felt252,               // Claim only
    note_id: felt252,             // Claim/Refund — supplied by ${openNoteIds[0]}
) -> Span<OpenNoteDeposit>;
```

Calldata order is deserialised straight into these parameters by the pool. It must match exactly on
both sides. **This signature does not change after Day 1.** If it must, it changes in this file
first and both people are told before either pushes.

### 4.2 Storage

```cairo
#[derive(Serde, Copy, Drop, PartialEq, Debug, starknet::Store)]
pub struct ClaimEntry {
    pub token:     ContractAddress,
    pub amount:    u128,
    pub expiry:    u64,
    pub refund_to: ContractAddress,
    pub claimed:   bool,
}
```

Keyed by `commitment`. A zero `token` means "not found".

### 4.3 Events — required

```cairo
#[event]
#[derive(Drop, starknet::Event)]
pub enum Event {
    ClaimCreated: ClaimCreated,
    ClaimRedeemed: ClaimRedeemed,
    ClaimRefunded: ClaimRefunded,
}

#[derive(Drop, starknet::Event)]
pub struct ClaimCreated {
    #[key] pub commitment: felt252,
    pub token: ContractAddress,
    pub amount: u128,
    pub expiry: u64,
}

#[derive(Drop, starknet::Event)]
pub struct ClaimRedeemed {
    #[key] pub commitment: felt252,
    pub claimant: ContractAddress,
    pub amount: u128,
}

#[derive(Drop, starknet::Event)]
pub struct ClaimRefunded {
    #[key] pub commitment: felt252,
    pub refund_to: ContractAddress,
    pub amount: u128,
}
```

Every one of the three demo transactions must carry one of these. `ClaimCreated` and
`ClaimRedeemed` cover transactions 2 and 3; transaction 1 is a plain shield and is judged against
the pool alone.

Indexing `commitment` also gives the client a free way to read claim status without a server.

### 4.4 Invariants

1. `privacy_invoke` asserts `get_caller_address()` is the privacy pool. Non-negotiable — nobody
   drives the escrow directly.
2. Deposit returns an **empty span**. The pool has already moved the tokens via its `Withdraw`
   action; there is nothing to credit yet.
3. Deposit rejects a commitment that already exists, and rejects zero token, zero amount, or an
   expiry at or before `get_block_timestamp()`.
4. Claim recomputes the commitment from the link key. It never trusts a passed-in commitment as
   authorisation.
5. `claimed` flips exactly once. A second claim reverts; a refund after a claim reverts.
6. Claim requires `get_block_timestamp() < expiry`. Refund requires `>= expiry` **and** a caller
   matching `refund_to`.
7. Domain-separated hashing throughout, so Xenia commitments cannot collide with anything else.
8. The escrow `approve`s the pool to pull and returns an `OpenNoteDeposit`. It never transfers
   tokens directly.

### 4.5 Link keys, not bare secrets

The claim transaction carries its authorisation in public calldata. A bare secret would be visible
to anyone who sees the transaction before it is included, and replayable against a different
recipient. Xenia binds the claim to the claimer instead.

The link carries a **private key**, not a password:

```
sk         = random felt (CSPRNG, reduced into the STARK field)
pk         = stark_curve_public_key(sk)
commitment = poseidon(XENIA_COMMITMENT_TAG_V1, pk)
```

To claim, the client signs the claimant's address with `sk`:

```
message = poseidon(XENIA_CLAIM_TAG_V1, commitment, claimant)
(r, s)  = sign(message, sk)
```

The contract recovers nothing and stores nothing new. It verifies:

```cairo
check_ecdsa_signature(message, pk, sig_r, sig_s)
```

An observer who copies the calldata gets a signature that authorises the original claimant's
address and cannot produce one for their own. The link is still a bearer instrument — whoever holds
the *link* can claim, because they hold `sk`. That is the product. What they cannot do is steal a
claim already in flight.

On deposit the client passes the finished commitment, because there is no `pk` to check against
yet. On claim and refund it passes `pk` itself and the contract recomputes the commitment — never
trusting a caller-supplied lookup key as authorisation. Both travel in the same `key` slot.

### 4.6 Errors

`ZERO_COMMITMENT`, `ZERO_TOKEN`, `ZERO_AMOUNT`, `EXPIRY_IN_PAST`, `COMMITMENT_EXISTS`,
`COMMITMENT_NOT_FOUND`, `ALREADY_CLAIMED`, `CLAIM_EXPIRED`, `NOT_YET_EXPIRED`, `NOT_REFUND_OWNER`,
`BAD_SIGNATURE`, `CALLER_NOT_PRIVACY`.

### 4.7 Tests

Ship with these passing:

- claim succeeds once, credits the right amount
- second claim reverts `ALREADY_CLAIMED`
- claim with a signature over a different address reverts `BAD_SIGNATURE`
- claim after expiry reverts `CLAIM_EXPIRED`
- refund before expiry reverts `NOT_YET_EXPIRED`
- refund by anyone other than `refund_to` reverts `NOT_REFUND_OWNER`
- refund after a claim reverts `ALREADY_CLAIMED`
- a caller that is not the pool reverts `CALLER_NOT_PRIVACY`
- every successful path emits its event

## 5. Client

### 5.1 Create a claim

Action list, in phase order:

```
{ type: 'withdraw', token, amount, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW, calldata: [Deposit, commitment, token,
                                                       amount, expiry, refund_to] }
```

The withdraw settles the pool's balance invariant, which is why the escrow returns an empty span.
The link is `https://<host>/c#<sk>` — the key lives in the URL fragment and is never sent to a
server.

### 5.2 Claim

```
{ type: 'transfer', token, amount: 'OPEN', recipient: <claimant> }
{ type: 'invoke',   contract: XENIA_ESCROW, calldata: [Claim, commitment, claimant,
                                                       sig_r, sig_s, '${openNoteIds[0]}'] }
```

`${openNoteIds[0]}` is a wallet-resolved placeholder that expands to the id of the first transfer
action with amount `OPEN`. The amount is measured at execution, which is how the open note gets
credited with a value the client never states.

### 5.3 Claim route — settle this on Day 1, before any UI

Registration is phase 0 and the invoke is phase 7, so the protocol permits register-and-claim in
one transaction. The route does not obviously permit it.

`STRK20_ACTION` in `@starknet-io/types-js` has exactly four variants — `deposit`, `withdraw`,
`transfer`, `invoke`. There is no register action, and the transfer action's own documentation says
it moves funds "to another registered user". `autoRegister` is an **SDK** flag, not a wallet one.

So the Wallet API route works only if the connected wallet registers the account itself while
assembling the transaction.

**Probe first, build second.** Connect an account that has never registered and submit a
claim-shaped transaction on testnet.

- If the wallet self-registers: build the claim page on the Wallet API.
- If it does not: build the claim page on the SDK with `build({ autoRegister: true, autoSetup: true })`.
  This needs Node ≥ 24, the SDK from GitHub Packages, `provingBlockId = currentBlock - 10`,
  `tip: 0n`, and `proofDetails` **omitted entirely** rather than passed empty.

The SDK route scores higher on integration depth, which names the SDK explicitly. Either answer is
fine. Not knowing on Day 4 is not.

### 5.4 Verified mainnet values

Checked against the live network by the sprint team. Use these, not the Sepolia values in the
starter kit's `.env.example`.

```bash
CHAIN_ID=SN_MAIN                  # 0x534e5f4d41494e
RPC_URL=https://rpc.starknet.lava.build
POOL_ADDRESS=0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
```

**The mainnet proving service URL is not published.** This decides the route as much as wallet
support does:

- **Wallet API route** needs an RPC URL and nothing else — the user's wallet reaches a prover
  itself. It requires the connected wallet to implement the STRK20 methods, and not every Starknet
  wallet does.
- **SDK route** means we reach the proving service, so we need its URL, and on mainnet it does not
  exist publicly yet. Teams that need it are told to open an issue and ask.

Registering a viewing key and shielding need **no proof at all** — both are ordinary public
transactions. Spending notes privately is what needs a prover, which is why the claim transaction
does and transaction 1 does not.

Probe wallet support with `wallet_strk20Balances`. It is read-only and safe to call against any
wallet; a wallet that answers "not implemented" has told us to show a different path.

### 5.5 Environment

- `starknet@^10.4.0` from the npm `next` tag. A bare install resolves to 10.0.x, which has none of
  the STRK20 API — `WalletAccountV6`, `strk20InvokeTransaction` and `STRK20_ACTION` will all be
  missing. This is the first hour of the project if it is skipped.
- Wallet API ≥ 0.10.3.
- Viewing keys are `bigint`, never hex strings — a hex string type-checks and silently derives the
  wrong channel keys, and notes sent to that account never decrypt.
- Notes mature 10 blocks after creation. A claimed note is not immediately spendable; the demo
  should not imply otherwise.
- After any failed submission, call `invalidateProofNonceCache()` before retrying.
- The pool address in the STRK20 docs is Sepolia. The mainnet address is in §5.4.

### 5.6 Pages

| Route | Purpose |
|---|---|
| `/create` | Pick token, amount, expiry. Produces the link and a QR code |
| `/c#<sk>` | The claim page. The entire product |
| `/claims` | Sender's claims, status read from `ClaimCreated` / `ClaimRedeemed`, refund button |

Dry-run every calldata change with `strk20PrepareInvoke` — it builds and proves without submitting,
and it is the cheapest way to catch a shape mismatch.

## 6. Documentation

The README carries the leak table verbatim, including the bearer-instrument row and the
calldata row. State how the system behaves; do not apologise for it.

Add a section on reusing `XeniaEscrow` in another application, and post it in the sprint Telegram
once mainnet is live. Several teams on the hub have the same registration wall and a week left to
do something about it. If another team depends on it, that counts in our favour.

## 7. Division

| Owner | Surface |
|---|---|
| Sam | `XeniaEscrow`, tests, testnet and mainnet deploys, calldata shape, the three transactions, `strk20.json` |
| Jadon | Client, claim flow, link and key generation, pages, Vercel, README, leak table, video |

Interface frozen Day 1 (§4.1). The client builds against a stub helper on testnet until the real
one is deployed.

## 8. Definition of done

- [ ] `XeniaEscrow` on mainnet, address in `strk20.json`
- [ ] Three mainnet hashes, each carrying a `XeniaEscrow` event where a contract is listed
- [ ] Transaction 3 executed from an account with no prior viewing key, with explorer proof before
      and after
- [ ] Demo live, public, no login wall, Website field set on the repo
- [ ] 3-minute video
- [ ] README a stranger can follow, leak table included, licence present
- [ ] Someone outside the team claims a link cold, with no help
