---
title: Deployments
description: Addresses, class hashes and toolchain versions.
order: 1
---

# Deployments

## `XeniaEscrow`

| Network | Address |
|---|---|
| **Mainnet** | `0x257082062a074eb79575b859c9b3aadd40a986501223928121b5a1f56627095` |
| Sepolia | `0x7d01c97a95ddc117ac63be7a6ab4b042d87d8a70c1cadbdb1f4c1f88b68094e` |

Both deployed under class hash
`0x65651460529d1b5d02ee24e7038dfa47df038cd5b7788aebd65fd5c2e07dfc5`, so behaviour is
identical across the two networks. The code that passed the test suite is the code that is
live.

## STRK20 pool

| Network | Address |
|---|---|
| **Mainnet** | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` |

Confirmed on-chain: the escrow's `privacy_contract()` returns this address, and the RPC
reports chain id `SN_MAIN`.

**The pool address published in the STRK20 documentation is Sepolia.** Do not substitute it.

## Tokens

Mainnet, checked against Starkscan. `decimals` is display-only — amounts cross the wire in
the smallest unit.

| Symbol | Decimals | Address |
|---|---:|---|
| STRK | 18 | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| ETH | 18 | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| USDC | 6 | `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8` |

## Fee

| | |
|---|---|
| Amount | 6 STRK (`get_fee_amount()`) |
| Collector | `0xd79041634625e5288296fbc648088788710ba44903a3a49468a66567749e77` |

See [fees](../concepts/fees.md).

## Toolchain

| | |
|---|---|
| Cairo / `starknet` | 2.20.0 |
| OpenZeppelin Cairo | 3.0.0 |
| `snforge_std` | 0.63.0 |
| Edition | `2024_07` |

```bash
cd contracts
scarb build
scarb run test        # snforge test --features test_contracts
```

Full deployment history and notes:
[`contracts/DEPLOYMENTS.md`](https://github.com/jadonamite/XENIA/blob/main/contracts/DEPLOYMENTS.md).
