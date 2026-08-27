---
title: Link keys and signatures
description: Deriving commitments, signing claims and refunds, with cross-language test vectors.
order: 3
---

# Link keys and signatures

Everything on this page has a matching implementation on both sides: `starknet.js` in the
client, Cairo in the contract. The vectors at the bottom are asserted in both test suites.

## Deriving a link key

```
sk         = random felt (CSPRNG, reduced into the STARK field)
pk         = stark_curve_public_key(sk)          // the Stark key: x coordinate only
commitment = poseidon(['XENIA_COMMITMENT_V1', pk])
```

In TypeScript:

```ts
import { ec, hash, shortString } from 'starknet';

const COMMITMENT_TAG = shortString.encodeShortString('XENIA_COMMITMENT_V1');

const sk = `0x${Buffer.from(ec.starkCurve.utils.randomPrivateKey()).toString('hex')}`;
const pk = `0x${ec.starkCurve.getStarkKey(sk)}`;
const commitment = hash.computePoseidonHashOnElements([COMMITMENT_TAG, pk]);
```

`randomPrivateKey` draws from the platform CSPRNG and reduces into the curve order, which is
what keeps the keyspace uniform. **Never substitute `Math.random`** — a guessable link is a
drained escrow.

Two forms of the public key matter:

- **The Stark key** (x only) is what goes on-chain. Cairo's `check_ecdsa_signature` works on
  it.
- **The uncompressed public key** (`getPublicKey(sk, false)`) is needed only to verify
  locally, because the curve's `verify` wants both coordinates. It never leaves the client.

## Domain tags

Three tags, all Cairo short strings:

| Tag | Used for |
|---|---|
| `XENIA_COMMITMENT_V1` | the commitment hash |
| `XENIA_CLAIM_V1` | claim authorisation |
| `XENIA_REFUND_V1` | refund authorisation |

Domain separation does two jobs. Across protocols it stops a Xenia commitment colliding with
another contract's hash of the same input. Within Xenia it stops a claim signature being
replayed as a refund, or the reverse.

## Signing a claim

```
message = poseidon(['XENIA_CLAIM_V1', commitment, claimant])
(r, s)  = sign(message, sk)
```

`commitment` here is the **hash**, not `pk` — even though position 1 of the claim calldata
carries `pk`. The contract hashes `pk` itself and uses the result in the message it verifies.

```ts
const CLAIM_TAG = shortString.encodeShortString('XENIA_CLAIM_V1');

const message = hash.computePoseidonHashOnElements([CLAIM_TAG, commitment, claimant]);
const { r, s } = ec.starkCurve.sign(message, sk);
```

`claimant` is the address being paid. That binding is the anti-replay property: a signature
lifted from the mempool authorises one address, and it is not the copier's.

## Signing a refund

The same shape, different tag, and the refunder in place of the claimant:

```
message = poseidon(['XENIA_REFUND_V1', commitment, refunder])
```

## Verifying locally

Verify before submitting so a mismatch fails in the UI rather than as a revert. The curve's
`verify` takes a compact hex signature — `r` and `s` each zero-padded to 64 hex characters
and concatenated — and the **uncompressed** public key:

```ts
const compact = r.replace(/^0x/, '').padStart(64, '0')
              + s.replace(/^0x/, '').padStart(64, '0');

ec.starkCurve.verify(compact, message, fullPk);
```

Cairo's side takes only the Stark key and recovers what it needs.

## The Cairo side

```cairo
pub const XENIA_COMMITMENT_TAG_V1: felt252 = 'XENIA_COMMITMENT_V1';
pub const XENIA_CLAIM_TAG_V1: felt252 = 'XENIA_CLAIM_V1';
pub const XENIA_REFUND_TAG_V1: felt252 = 'XENIA_REFUND_V1';

let key = poseidon_hash_span(array![XENIA_COMMITMENT_TAG_V1, pk].span());
let message = poseidon_hash_span(array![XENIA_CLAIM_TAG_V1, key, recipient].span());
assert(check_ecdsa_signature(message, pk, sig_r, sig_s), 'BAD_SIGNATURE');
```

`recipient` is the **`claimant` parameter at position 6**, on both claim and refund — not
`refund_to`.

## Test vectors

Produced by the TypeScript implementation and asserted in
[`contracts/tests/test_js_interop.cairo`](https://github.com/jadonamite/XENIA/blob/main/contracts/tests/test_js_interop.cairo).
If your implementation reproduces these, it will interoperate.

```
sk         0x03a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f
pk         0x6a1061177c2ac48f00771e7b40a46c8f12be1ca9d5d4a9fefb76742e8aee8c4
claimant   0x048f5f116ba486a079969bdc934846998f0099c11d58874cdb5983a7411addf4

commitment 0x121e2e8a3e39c976541c4aec0c9ba566dcb1af2d1bc5d473441bbc4851dba2b
claim msg  0x7b3325e71990a02c3861aec2e7166a7f39e3b703816da209694a2c9bc42f7c1
refund msg 0x147106a7b6069b7460d6ef016b37e47eb11d7942a12d3ac8d0d1b731f84cf8b

sig r      0x5e73504908cb975519c083370fe51f3398f4b8707e82b984abf3c0f94a9be99
sig s      0x2209e7281d77328c533813f81dd5f204e673327ae3ac87c2e13cc1f6ab2a8c1
```

The signature is over the claim message, by `sk`, for that claimant.

## The link URL

```
https://<host>/c#<sk>
```

The fragment carries the key. Fragments are never transmitted in HTTP requests, so the key
does not reach a server — including Xenia's own. See [claim links](../concepts/claim-links.md).
