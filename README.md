# Xenia

**Pay someone privately who has never touched the privacy pool.** They claim from a link, and
registration happens inside the claim.

STRK20 Private Sprint · Starknet mainnet · [Docs](docs/) · [Architecture](ARCHITECTURE.md)

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

Registration sits at phase 0 and the external invoke at phase 7, so a brand-new account registers
and claims in a single atomic transaction. That ordering is the whole product.

Xenia drives registration from its own claim page rather than depending on a wallet to bundle it,
so the sender is never blocked on the recipient's state — no wallet menus, no "ask them to
register" step.

`XeniaEscrow` is an anonymizer contract. Creating a claim withdraws from the pool to the escrow and
records a commitment; the escrow returns an empty span, because the tokens have already moved.
Claiming recomputes the commitment from the link key, checks a signature binding the claim to the
claimant's address, approves the pool to pull, and returns an `OpenNoteDeposit` that credits the
recipient's open note.

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
| A claim signature seen before inclusion | Authorises one address only. Copying it does not let someone redirect the funds |

The bearer-instrument row is a property of the design, not a defect to be fixed later. **Treat a
claim link like cash:** anyone you send it to, and anyone they forward it to, can spend it. A lost
link cannot be recovered — only refunded after expiry, by the sender.

**Xenia's guarantee is identity unlinkability, and it scales with the escrow's traffic.** Every
claim shares one escrow address, so the set an observer must guess from is every claim the escrow
is holding. Amounts stay plaintext by design — that is STRK20's model, not Xenia's choice.

Full threat model, including timing correlation and what an observer can and cannot infer, in
[the privacy model](docs/concepts/privacy-model.md).

## Deployed

| Network | `XeniaEscrow` |
|---|---|
| Mainnet | `0x257082062a074eb79575b859c9b3aadd40a986501223928121b5a1f56627095` |
| Sepolia | `0x7d01c97a95ddc117ac63be7a6ab4b042d87d8a70c1cadbdb1f4c1f88b68094e` |

Same class hash on both. Contract, tests and deploy tooling live in
[`contracts/`](contracts/); addresses and deployment notes in
[`contracts/DEPLOYMENTS.md`](contracts/DEPLOYMENTS.md).

## Reusing `XeniaEscrow` in your own app

If you are building on STRK20 you will hit the same wall: you cannot pay someone who has not
registered. `XeniaEscrow` is deployed, tested and MIT-licensed, and there is nothing Xenia-specific
about it. **Use ours, or fork it.**

**Call it as an anonymizer.** Two actions, in phase order:

```js
// park funds behind a link key
{ type: 'withdraw', token, amount, recipient: XENIA_ESCROW }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [0, commitment, token, amount, expiry, refundTo, 0, 0, 0, 0] }

// claim them
{ type: 'transfer', token, amount: 'OPEN', recipient: claimant }
{ type: 'invoke',   contract: XENIA_ESCROW,
  calldata: [1, pk, 0, 0, 0, 0, claimant, sigR, sigS, '${openNoteIds[0]}'] }
```

All ten positions are required on every operation — the pool deserialises calldata positionally, so
a short array fails before the contract runs. Full shape in
[`contracts/INTERFACE.md`](contracts/INTERFACE.md).

**Read status without a server.** `ClaimCreated`, `ClaimRedeemed` and `ClaimRefunded` are all
indexed on the commitment, so a claim's state is a log query. `get_claim(commitment)` returns the
entry directly; a zero token means not found.

**Four things worth knowing before you build on it**, each of which cost us time to learn:

- **A first-time claimant cannot pay the pool fee.** The relayer fronts it and reclaims it with a
  `withdraw`, and the pool's balance invariant needs an inflow to match — which someone holding
  nothing inside the pool has none of. The transaction is refused by the protocol, not the wallet.
  Deposit takes two optional parameters to pre-fund the claimant out of the escrow, which fixes it.
- **Pay that fee from the escrow, never from the sender's address.** Funding a claimant directly
  puts a public sender → recipient edge on chain and undoes the privacy you came for.
- **Claim and refund pass the link public key**, not the commitment. The contract hashes it and
  looks that up itself, so a passed-in commitment is never trusted as authorisation.
- **Refund cannot check who is asking.** `privacy_invoke` is always called by the pool, so
  `get_caller_address()` is never the user. Authorise it by signature instead.

Measurements behind those claims — fee mechanics, registration behaviour, what the pool's balance
invariant actually enforces — are in
[`contracts/ONCHAIN-FINDINGS.md`](contracts/ONCHAIN-FINDINGS.md), taken from the pool's source and
its mainnet transaction history rather than from documentation.

## Roadmap — private receipt without setup

Today a recipient who has never used the pool is paid in **ordinary tokens**. They receive
instantly with nothing to set up, but that transfer is public: their address is visible receiving
from the escrow. The sender stays hidden either way.

Paying them **privately** would need them registered, and that is where it stops — but not for the
reason it first appears.

**It is not that only they can register.** The pool binds nothing to the caller:
`get_caller_address()` appears once in the whole contract, to charge the fee.
`compile_actions` takes the user's address and viewing key as *parameters*, and `apply_actions`
takes neither. A third party can register someone, which is exactly how relayers submit private
transactions at all.

**It is that every pool transaction needs a proof.** `apply_actions` calls `validate_proof`
unconditionally, which asserts the transaction carries proof facts from a virtual Starknet OS
execution:

```cairo
assert(!proof_facts_span.is_empty(), errors::EMPTY_PROOF_FACTS);
assert(program_variant == VIRTUAL_SNOS, errors::INVALID_PROGRAM_VARIANT);
```

Those facts come from a proving service. Wallets reach one; the Wallet API exposes no `register`
action, so a dapp cannot ask a wallet to register on a recipient's behalf, and cannot produce the
proof itself without a prover.

**The prover is self-hostable**, which makes this a roadmap item rather than a dead end:

```bash
docker run -p 3000:3000 \
  -e RPC_URL=<v0.10 node> \
  -e CHAIN_ID=SN_MAIN \
  ghcr.io/starkware-libs/starknet-privacy/transaction-prover:PRIVACY-0.14.3-RC.2
```

It takes an Invoke V3 transaction and returns `{ proof, proof_facts }`. With one running, the
claim link can register the recipient and then pay them, in that order, without either party
setting anything up:

1. The recipient opens the link and signs one ordinary message. Any Starknet wallet can do this;
   it needs no STRK20 support of its own.
2. Their viewing keypair is derived from that signature **in their browser**. Only the public half
   ever leaves it.
3. Xenia builds the registration, proves it, and submits it. Because the private half never
   travelled, Xenia cannot read their notes afterwards — registering someone does not mean
   surveilling them.
4. They are registered, and the private transfer lands. Neither end is visible on chain.

Note which half of this the Wallet API can already do and which it cannot. A wallet accepts five
actions — `deposit`, `withdraw`, `transfer`, `invoke`, `shadowAccountInvoke` — and registration is
not among them, so step 3 can never be delegated to the sender's wallet however the flow is
arranged. It has to be a transaction we build and prove ourselves.

What that costs, stated plainly: a host with real CPU and memory for STARK proving, an RPC node on
the v0.10 API, a move from the Wallet API to the SDK route, and a discovery indexer, since
`ContractDiscoveryProvider` is not exported in `0.14.3-rc.5`. Also care with the viewing key —
it is derived in the recipient's browser, and calling `compile_actions` over a public RPC would
hand it to that node.

## Credit

The escrow pattern starts from the [reference escrow helper](https://strk20-by-example.org/helpers/escrow)
published on STRK20 by Example. That reference parks funds behind a hashed secret and stops there.
Xenia adds expiry and refund, folds registration into the claim, and emits events for every state
change.

## Licence

[MIT](LICENSE).
