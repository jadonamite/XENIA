# Deployments

## Sepolia — 2026-08-26 (current)

Redeployed after the constructor gained a fee token and Deposit gained optional pre-funding.

| | |
|---|---|
| `XeniaEscrow` | `0x7d01c97a95ddc117ac63be7a6ab4b042d87d8a70c1cadbdb1f4c1f88b68094e` |
| Class hash | `0x65651460529d1b5d02ee24e7038dfa47df038cd5b7788aebd65fd5c2e07dfc5` |
| Pool | `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91` |
| Fee token (STRK) | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| Deploy tx | `0x27a586c3005752b3c35edce8a0c9c6438eb587e92aadfd5d9eeef800e9d5f57` |

Verified live: `privacy_contract()` returns the Sepolia pool, `get_claim` on an unknown commitment
returns the all-zero sentinel, and the deployed ABI carries all four events including
`ClaimPrefunded`.

**Client should point at this address**, not the one below.

## Sepolia — 2026-08-25 (superseded)

Rehearsal for mainnet. Everything below was verified on-chain after deploying, not just assumed
from a script exiting zero.

| | |
|---|---|
| `XeniaEscrow` | `0x4564195cae51bab74923df3029c43a4f27149b361488235c7e3ff1ea1374b81` |
| Class hash | `0x448eddda01dc06623793bc0828c39781f58a4cb1d2c5b931705b11be1acd764` |
| Pool (constructor arg) | `0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91` |
| Declare tx | `0x533115db6b8849a9a09a784773b2d4961cded3c94edc68717fb628cb5cf7e0e` |
| Deploy tx | `0x183fe8a11bc6a1b5ad7263350d1a590b7ab5d1673ac8bf706856087608c4673` |
| RPC used | `https://api.zan.top/public/starknet-sepolia` |
| Cost | ~0.06 STRK |

Post-deploy checks: `privacy_contract()` returns the Sepolia pool, and `get_claim` on an unknown
commitment returns the all-zero not-found sentinel.

## What the rehearsal caught

None of these were visible from a dry run, and each would have cost a mainnet attempt:

1. **starknet.js v10 replaced the positional `Account` constructor with an options object.** The old
   form binds `provider` to `options`, leaving `address` undefined, and fails inside the library on
   `address.toLowerCase()` — which reads like a bug in the caller.
2. **Argent/Ready v0.4 accounts reject a bare `[r, s]`.** They validate against
   `Array<SignerSignature>`; a single Starknet owner encodes as five felts.
3. **An account with a guardian cannot be scripted at all.** Argent Shield requires the owner *and*
   the guardian to sign, and the guardian key is held by Argent. The fix is a dedicated
   OpenZeppelin deployer account, which is better practice for a deploy key anyway.
4. **Some public RPCs fail on `starknet_estimateFee`** with an opaque `-32603 Internal error`.
   Blast is retired, Lava's testnet endpoint errors, and cartridge failed to estimate a declare.

## Mainnet checklist

- [ ] Generate a **fresh** deployer with `new-deployer.mjs --generate`; never paste its key anywhere
- [ ] Fund it with just enough STRK
- [ ] `POOL_ADDRESS=0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` and
      `CONFIRM_MAINNET=yes` — the deploy script refuses any other pool on `SN_MAIN`
- [ ] `npm run preflight`, then `npm run deploy:dry`, then `npm run deploy`
- [ ] Verify `privacy_contract()` returns the **mainnet** pool before doing anything else
- [ ] Record the address in `strk20.json` and `NEXT_PUBLIC_XENIA_ESCROW`
