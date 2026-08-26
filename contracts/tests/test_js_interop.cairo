//! Cross-language agreement between the client and the contract.
//!
//! The client derives the link key, hashes the commitment and signs the claim in JavaScript; the
//! contract recomputes all of it in Cairo. If the two disagree by so much as a domain tag or a
//! hash-padding convention, every claim reverts `COMMITMENT_NOT_FOUND` or `BAD_SIGNATURE` — and
//! it does so on mainnet, with real money, having looked fine in every isolated test.
//!
//! So the values below are **produced by JavaScript**, using exactly the calls
//! `src/lib/xenia/crypto.ts` makes:
//!
//! ```js
//! const pk         = ec.starkCurve.getStarkKey(SK);
//! const commitment = hash.computePoseidonHashOnElements([COMMITMENT_TAG, pk]);
//! const claimMsg   = hash.computePoseidonHashOnElements([CLAIM_TAG, commitment, claimant]);
//! const sig        = ec.starkCurve.sign(claimMsg, SK);
//! ```
//!
//! Regenerate with `contracts/scripts/js-reference.mjs` if the tags or the derivation ever change.
//! A failure here means the two halves of Xenia have drifted apart.

use xenia::xenia_escrow::{claim_message, compute_commitment, refund_message};

/// Fixed private key, so the values are reproducible:
/// `0x03a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f`
const SK_PUBKEY: felt252 = 0x6a1061177c2ac48f00771e7b40a46c8f12be1ca9d5d4a9fefb76742e8aee8c4;
const CLAIMANT_ADDR: felt252 = 0x048f5f116ba486a079969bdc934846998f0099c11d58874cdb5983a7411addf4;

const JS_COMMITMENT: felt252 = 0x121e2e8a3e39c976541c4aec0c9ba566dcb1af2d1bc5d473441bbc4851dba2b;
const JS_CLAIM_MSG: felt252 = 0x7b3325e71990a02c3861aec2e7166a7f39e3b703816da209694a2c9bc42f7c1;
const JS_REFUND_MSG: felt252 = 0x147106a7b6069b7460d6ef016b37e47eb11d7942a12d3ac8d0d1b731f84cf8b;
const JS_SIG_R: felt252 = 0x5e73504908cb975519c083370fe51f3398f4b8707e82b984abf3c0f94a9be99;
const JS_SIG_S: felt252 = 0x2209e7281d77328c533813f81dd5f204e673327ae3ac87c2e13cc1f6ab2a8c1;

/// Poseidon over `[tag, pk]` must land on the same felt in both languages, or a claim looks up a
/// commitment that was never stored.
#[test]
fn commitment_matches_the_client() {
    let cairo = compute_commitment(SK_PUBKEY);
    assert!(cairo == JS_COMMITMENT, "commitment differs from the client's");
}

#[test]
fn claim_message_matches_the_client() {
    let claimant = CLAIMANT_ADDR.try_into().unwrap();
    let cairo = claim_message(JS_COMMITMENT, claimant);
    assert!(cairo == JS_CLAIM_MSG, "claim message differs from the client's");
}

#[test]
fn refund_message_matches_the_client() {
    let refunder = CLAIMANT_ADDR.try_into().unwrap();
    let cairo = refund_message(JS_COMMITMENT, refunder);
    assert!(cairo == JS_REFUND_MSG, "refund message differs from the client's");
}

/// The one that matters most: a signature produced by `ec.starkCurve.sign` in the browser must
/// satisfy `check_ecdsa_signature` on chain — same curve, same encoding, same argument order.
#[test]
fn a_signature_made_in_javascript_verifies_in_cairo() {
    let ok = core::ecdsa::check_ecdsa_signature(JS_CLAIM_MSG, SK_PUBKEY, JS_SIG_R, JS_SIG_S);
    assert!(ok, "a client-produced signature was rejected by the contract's check");
}

/// And it must not verify against a different message, or the binding that stops a claim being
/// redirected in the mempool is doing nothing.
#[test]
fn the_signature_does_not_verify_for_another_message() {
    let ok = core::ecdsa::check_ecdsa_signature(JS_REFUND_MSG, SK_PUBKEY, JS_SIG_R, JS_SIG_S);
    assert!(!ok, "a claim signature verified against the refund message");
}
