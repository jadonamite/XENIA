/**
 * Produce the reference values that `tests/test_js_interop.cairo` asserts.
 *
 * The point is to catch a disagreement between the two halves of Xenia — the client derives and
 * signs in JavaScript, the contract recomputes in Cairo, and a mismatch in a domain tag or a
 * hash-padding convention reverts every claim. Cheap to catch here, expensive to catch on mainnet.
 *
 * These calls mirror `src/lib/xenia/crypto.ts` exactly. If that file changes, run this again and
 * paste the output into the Cairo test.
 *
 *   node js-reference.mjs
 */

import { ec, hash, shortString } from 'starknet';

/** Fixed so the values are reproducible run to run. Not a key anyone should fund. */
const SK = '0x03a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f';
const CLAIMANT = '0x048f5f116ba486a079969bdc934846998f0099c11d58874cdb5983a7411addf4';

const hex = (v) =>
  typeof v === 'string' ? (v.startsWith('0x') ? v : `0x${v}`) : `0x${v.toString(16)}`;

const COMMITMENT_TAG = shortString.encodeShortString('XENIA_COMMITMENT_V1');
const CLAIM_TAG = shortString.encodeShortString('XENIA_CLAIM_V1');
const REFUND_TAG = shortString.encodeShortString('XENIA_REFUND_V1');

const pk = hex(ec.starkCurve.getStarkKey(SK));
const commitment = hex(hash.computePoseidonHashOnElements([COMMITMENT_TAG, pk]));
const claimMsg = hex(hash.computePoseidonHashOnElements([CLAIM_TAG, commitment, CLAIMANT]));
const refundMsg = hex(hash.computePoseidonHashOnElements([REFUND_TAG, commitment, CLAIMANT]));
const sig = ec.starkCurve.sign(claimMsg, SK);

console.log(`
Paste into contracts/tests/test_js_interop.cairo:

const SK_PUBKEY: felt252 = ${pk};
const CLAIMANT_ADDR: felt252 = ${CLAIMANT};
const JS_COMMITMENT: felt252 = ${commitment};
const JS_CLAIM_MSG: felt252 = ${claimMsg};
const JS_REFUND_MSG: felt252 = ${refundMsg};
const JS_SIG_R: felt252 = ${hex(sig.r)};
const JS_SIG_S: felt252 = ${hex(sig.s)};
`);
