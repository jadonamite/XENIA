---
title: Configuration
description: Environment variables, constants, and running the app locally.
order: 2
---

# Configuration

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_XENIA_ESCROW` | yes | The `XeniaEscrow` address the client talks to |

Set it to the mainnet or Sepolia address from [deployments](deployments.md), depending on
which network you are pointing at.

**`NEXT_PUBLIC_*` is baked in at build time.** Changing it on a hosting provider does
nothing until you redeploy — the old value is already inside the JavaScript bundle.

## Constants

Compiled in, in [`src/lib/xenia/config.ts`](https://github.com/jadonamite/XENIA/blob/main/src/lib/xenia/config.ts):

| Constant | Value | Notes |
|---|---|---|
| `MAINNET.chainId` | `SN_MAIN` | |
| `MAINNET.rpcUrl` | `https://rpc.starknet.lava.build` | |
| `MAINNET.poolAddress` | `0x0403…812a` | the STRK20 pool |
| `POOL_FEE` | `6 × 10¹⁸` | 6 STRK |
| `POOL_FEE_TOKEN` | STRK | the fee is always STRK |
| `NOTE_MATURITY_BLOCKS` | `10` | a claimed note is not immediately spendable |
| `DEFAULT_EXPIRY_SECONDS` | `604800` | 7 days |
| `TOKENS` | STRK, ETH, USDC | mainnet addresses |

## Running locally

```bash
npm install
echo 'NEXT_PUBLIC_XENIA_ESCROW=0x257082062a074eb79575b859c9b3aadd40a986501223928121b5a1f56627095' > .env.local
npm run dev
```

The app is Next.js 15 with React 19 and TypeScript.

```bash
npm run build       # production build
npm run lint        # eslint
npm test            # vitest
npx tsc --noEmit    # types
```

## Routes

| Route | Page |
|---|---|
| `/` | Landing |
| `/create` | Create a claim link |
| `/c#<sk>` | Claim a link |
| `/claims` | My Links — status and refunds for claims you created |
| `/privacy` | Privacy policy |
| `/terms` | Terms |

## Integration notes

Four things that silently produce wrong behaviour rather than an error:

- **Pin `starknet@^10.4.0` from the npm `next` tag.** A bare install resolves to 10.0.x, which has
  none of the STRK20 API — `WalletAccountV6`, `strk20InvokeTransaction` and `STRK20_ACTION` are all
  missing. Wallet API `>= 0.10.3` is required.
- **The viewing key is a bigint.** A hex string silently derives the wrong channel keys.
- **Notes mature 10 blocks after creation.** A freshly claimed note is not immediately spendable.
- **The pool address in the STRK20 docs is Sepolia.** Mainnet is in [deployments](deployments.md).

Deposits are screened by FPI and the pool verifies the signature on-chain. A claim is not a
deposit, but the sender's shield is.

## Contracts

```bash
cd contracts
scarb build
scarb run test
```

Toolchain versions in [deployments](deployments.md).
