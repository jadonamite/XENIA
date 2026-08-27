---
title: Client library
description: The TypeScript modules in src/lib/xenia and what each one is for.
order: 4
---

# Client library

Xenia's client logic lives in
[`src/lib/xenia`](https://github.com/jadonamite/XENIA/tree/main/src/lib/xenia). It is plain
TypeScript with `starknet` as its only chain dependency — no framework coupling beyond the
two React files at the end. Copy what you need.

## `crypto.ts` — link keys

```ts
generateLinkKey(): LinkKey
linkKeyFromSecret(sk: string): LinkKey
commitmentOf(pk: string): string

claimMessage(commitment, claimant): string
signClaim(sk, commitment, claimant): ClaimSignature
verifyClaim(fullPk, commitment, claimant, signature): boolean

refundMessage(commitment, refunder): string
signRefund(sk, commitment, refunder): ClaimSignature
verifyRefund(fullPk, commitment, refunder, signature): boolean
```

`LinkKey` carries `sk`, `pk` (the Stark key, for the chain), `fullPk` (uncompressed, for
local verification only) and `commitment`. Details and vectors: [signatures](signatures.md).

## `actions.ts` — transaction building

```ts
createClaimActions(params): STRK20_ACTION[]
claimActions(params): STRK20_ACTION[]
refundActions(params): STRK20_ACTION[]
```

Pure functions. Given parameters, they return the action list — no I/O, no wallet, nothing
to mock. Every calldata array they emit is exactly ten elements, asserted by tests.

`OPERATION` exports the three discriminants; `FIRST_OPEN_NOTE` is the
`'${openNoteIds[0]}'` placeholder, exported as a constant precisely so nobody retypes it and
hex-encodes it by accident.

The optional `fee` parameter on claim and refund prepends the STRK deposit that satisfies
the pool's balance invariant. The optional `prefund` parameter on create fills deposit
positions 6 and 9. See [action lists](action-lists.md).

## `escrow.ts` — reading state

```ts
provider(): RpcProvider
readClaim(commitment): Promise<ClaimEntry | null>
statusOf(entry, now?): ClaimStatus   // 'unknown' | 'claimable' | 'claimed' | 'expired'
```

Calls `get_claim` over RPC. A zero token means no entry. There is no server and no indexer
in this path.

## `link.ts` — URLs

```ts
CLAIM_PATH: '/c'
buildClaimLink(origin, sk): string
readClaimFragment(fragment): LinkKey | null
readClaimFromLocation(): LinkKey | null
```

The key lives in the fragment. `readClaimFromLocation` reads `window.location.hash` and
derives the full `LinkKey` from it.

## `wallet.ts` — discovery

```ts
discoverWallets(): StarknetWallet[]
probe(wallet): Promise<WalletProbe>
probeAll(): Promise<WalletProbe[]>
```

STRK20-capable wallets register through the Wallet Standard (`getWallets()` from
`@wallet-standard/app`), **not** the legacy `window.starknet_*` globals. `probe` checks a
wallet for the STRK20 method set before Xenia offers it.

## `amount.ts` — units

```ts
parseAmount(input, decimals): bigint
formatAmount(value, decimals): string
toHex(value: bigint): string
```

Amounts cross the wire in the token's smallest unit. `decimals` exists for display only.

## `store.ts` — the sender's copy

```ts
loadClaims(): StoredClaim[]
saveClaim(claim: StoredClaim): void
forgetClaim(commitment: string): void
```

Browser local storage, so **My Links** can show status and offer refunds. Status itself is
always re-read from the chain — the local copy is an index, not a source of truth.

## `config.ts` — constants

Network, pool address, escrow address, fee, tokens, note maturity, default expiry. See
[configuration](../reference/configuration.md).

## React bindings

`useWallet.ts` and `WalletContext.tsx` are the only framework-coupled files. Everything
above is usable without React.

## Tests

`xenia.test.ts` and `amount.test.ts`, under vitest. The action tests assert calldata length
and position on every operation, the fee action's ordering, and that a refund signature
cannot be replayed as a claim.

```bash
npm test
```
