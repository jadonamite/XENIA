# Probing the private register-and-claim route

Xenia's actual pitch — recipient registers and gets paid privately in one transaction — was
believed unbuildable on mainnet because no public prover existed. `~/Projects/Inertia/projects/velum`
found one (`docs/SPIKE.md`) and proved it against a real mainnet transaction. This is the same
proof, run against `XeniaEscrow`.

## Why the Wallet API route can't do this

`STRK20_ACTION` (what `wallet.account.strk20InvokeTransaction` sends) has no `register` action —
see `contracts/ONCHAIN-FINDINGS.md` §6. The SDK route can register, because it builds and proves
the transaction itself instead of asking a wallet to. That is the entire reason to make this
switch.

## What the probe needs

Two Sepolia accounts, in `.env.local` (gitignored, never committed):

```
XENIA_PROBE_SENDER_ADDRESS=
XENIA_PROBE_SENDER_PRIVATE_KEY=
XENIA_PROBE_CLAIMANT_ADDRESS=
XENIA_PROBE_CLAIMANT_PRIVATE_KEY=
```

- **Sender** needs an existing shielded balance in the Sepolia pool
  (`0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91`) — the same pool Velum
  uses. If it has none, run `velum/scripts/shield.ts` against it first.
- **Claimant** must be a **fresh account that has never registered a viewing key**. The probe
  checks this itself and refuses to run otherwise, because a probe against an already-registered
  account proves nothing. It only needs a little Sepolia STRK for gas — the pool fee itself is
  pre-funded out of the escrow by step 1, exactly as a real claimant would receive it.

Get Sepolia STRK from the Starknet faucet; it costs nothing.

## Running it

```bash
cd ~/Projects/Inertia/projects/Collabs/XENIA
npm install   # pulls the vendored SDK packages
node --experimental-strip-types --env-file=.env.local scripts/probe-register-claim.ts
```

It prints two transaction hashes and finishes by reading `get_public_key` on the pool for the
claimant address — if that comes back non-zero, the claim transaction registered them, and the
core thesis is proven end to end.

## If it passes

The claim page's SDK swap (README's "Roadmap" section, now not a roadmap) is: wrap the connected
wallet as a starknet.js `WalletAccount`, derive the claimant's viewing key from a signed message
instead of a raw private key, and replace `claimActions()` + `wallet.account.strk20InvokeTransaction`
in `src/app/c/page.tsx` with `privateClaimClient()` from `src/lib/xenia/sdk.ts`. Not done yet —
land this probe first.

## If it fails

Read the error before assuming the mechanism is wrong. The candidates, in order of likelihood:

- **Calldata shape.** `depositCalldata` / `claimCalldata` in the probe script are a first attempt
  at matching `XeniaEscrow::privacy_invoke`'s ten-felt order through the SDK's `invoke()` builder
  rather than the Wallet API's `${openNoteIds[0]}` placeholder. Compare against `actions.ts`.
- **Viewing key derivation.** The probe uses a placeholder (`account.address % field size`) rather
  than `deriveViewingKey` from `@starkware-libs/starknet-privacy-client` — real usage needs the
  latter, seeded from a wallet signature, not the account address.
- **Fee amount.** `POOL_FEE` is a mainnet-measured constant; Sepolia's `get_fee_amount()` may
  differ — read it live rather than trusting the constant, the way `velum/scripts/shield.ts` does.
