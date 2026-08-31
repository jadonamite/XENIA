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
| Mainnet | `0x2d329a8c65adccb51b17ef5274e7234c998dc29c02dc2c7a3c6d064af341cbe` |
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

## Private receipt without setup

A recipient who has never used the pool can be paid **privately** — registered and credited a
private note in one atomic transaction — with no wallet and nothing set up beforehand. This was
the open problem the section below used to describe; it is now built and proven live.

**It is not that only the recipient can register.** The pool binds nothing to the caller:
`get_caller_address()` appears once in the whole contract, to charge the fee. `compile_actions`
takes the user's address and viewing key as *parameters*, and `apply_actions` takes neither. A
third party can register someone, which is exactly how relayers submit private transactions at
all.

**The real constraint is that every pool transaction needs a proof**, and only an AVNU paymaster
can attach one. `apply_actions` calls `validate_proof` unconditionally, asserting the transaction
carries `proof_facts` from a virtual Starknet OS execution — a plain signed transaction never
carries this. The Wallet API exposes no `register` action either, so a dapp cannot ask a connected
wallet to register a recipient or produce the proof itself.

**The identity that gets registered is derived from the claim link, not from a wallet.**
`CorePrivateTransfersProver` needs a raw `signer.signTransaction()`, a primitive connected wallets
don't expose — they only offer `signMessage` and their own atomic `execute()`. So the claim flow
derives a fresh Starknet keypair directly from the link's own secret (domain-separated via
Poseidon), which the sender already knows at create-claim time and can pre-fund. The recipient
needs no wallet at all: opening the link is enough.

The flow:

1. The sender creates a claim as usual, pre-funding the derived claim-identity address with enough
   STRK to cover its own pool fee and one-time account deployment.
2. The recipient opens the link. The app derives the same account from the link's secret, deploys
   it if needed, and builds the registration + claim as a single `STRK20_ACTION[]` batch — the same
   actions shape the public-claim path already produces.
3. That batch is submitted through `CorePrivateTransfersProver` + `AvnuPaymaster` +
   `SdkWallet` (`@starkware-libs/starknet-privacy-client`), which is the only route that can attach
   `proof_facts` to the transaction. The app's own `/api/paymaster` route proxies this so the API
   key never reaches the browser.
4. The account registers its viewing key and receives a private note in the same transaction.
   Neither the registration nor the transfer is separately visible — there is no intermediate
   public state to observe.

Verified live on Sepolia, independently, twice: a plain create-claim
(`0x6d0240cf84c7e9e6c39e9cd5b3437b16d47da5956722fb151b817abbc7a80e7`), and a register-and-claim in
one transaction (`0x5d82ad254abac1d9d1ac5b467564225cdc89cff02ec77594a41ab0d3546f464`) — confirmed
by `get_public_key` on the pool going from `0x0` to a real key, and by the `ClaimRedeemed` event
`XeniaEscrow` itself emits, not the `claim_public` fallback.

This is now the primary path on `/c` — "Claim privately" is the default action; the old
wallet-based claim and the `claim_public` fallback are both still there, collapsed under an
"advanced" section, for recipients who'd rather use their own wallet or accept a public transfer.

## Credit

The escrow pattern starts from the [reference escrow helper](https://strk20-by-example.org/helpers/escrow)
published on STRK20 by Example. That reference parks funds behind a hashed secret and stops there.
Xenia adds expiry and refund, folds registration into the claim, and emits events for every state
change.

## Licence

[MIT](LICENSE).
