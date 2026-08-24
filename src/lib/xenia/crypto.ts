/**
 * Claim-link keys.
 *
 * A Xenia link carries a private key, not a password. The commitment stored on-chain is a hash of
 * the matching public key; to claim, the holder signs the claimant's address with the private key.
 *
 * That binding is the point. The claim transaction puts its authorisation in public calldata, so a
 * bare secret could be lifted by anyone who saw the transaction before it was included and replayed
 * against a different recipient. A signature over the claimant's address cannot be reused by
 * someone else, because it authorises an address they do not control.
 *
 * The link is still a bearer instrument — whoever holds the link holds the key. What they cannot do
 * is steal a claim that is already in flight.
 *
 * Mirrors the Cairo side: `poseidon_hash_span([tag, pk])` and `check_ecdsa_signature`.
 */

import { ec, hash, shortString } from 'starknet';

/** Domain separation, so Xenia commitments cannot collide with another protocol's hashes. */
export const COMMITMENT_TAG = shortString.encodeShortString('XENIA_COMMITMENT_V1');
export const CLAIM_TAG = shortString.encodeShortString('XENIA_CLAIM_V1');

export interface LinkKey {
  /** The private key. Lives in the URL fragment and nowhere else. */
  sk: string;
  /**
   * The Stark key — the x coordinate of the public key. This is what the contract takes, because
   * `check_ecdsa_signature` works on the Stark key.
   */
  pk: string;
  /**
   * The uncompressed public key. Only used to verify locally: the curve's `verify` needs both
   * coordinates, while Cairo needs only x. Never sent on-chain.
   */
  fullPk: string;
  /** poseidon(COMMITMENT_TAG, pk). Stored on-chain by the deposit. */
  commitment: string;
}

const hexOf = (value: bigint | string): string =>
  typeof value === 'string' ? (value.startsWith('0x') ? value : `0x${value}`) : `0x${value.toString(16)}`;

/**
 * Derives a link key from an existing private key.
 */
export function linkKeyFromSecret(sk: string): LinkKey {
  const normalised = hexOf(sk);
  const pk = hexOf(ec.starkCurve.getStarkKey(normalised));
  const fullPk = `0x${Buffer.from(ec.starkCurve.getPublicKey(normalised, false)).toString('hex')}`;
  return { sk: normalised, pk, fullPk, commitment: commitmentOf(pk) };
}

/**
 * Generates a fresh link key.
 *
 * `randomPrivateKey` draws from the platform CSPRNG and reduces into the curve order, which is what
 * keeps the keyspace uniform. Never substitute `Math.random` here — a guessable link is a drained
 * escrow.
 */
export function generateLinkKey(): LinkKey {
  const sk = ec.starkCurve.utils.randomPrivateKey();
  const asHex = `0x${Buffer.from(sk).toString('hex')}`;
  return linkKeyFromSecret(asHex);
}

/** poseidon(COMMITMENT_TAG, pk) — the on-chain identity of a claim. */
export function commitmentOf(pk: string): string {
  return hexOf(hash.computePoseidonHashOnElements([COMMITMENT_TAG, hexOf(pk)]));
}

/**
 * The message a claimant signs: the claim, bound to the address being paid.
 */
export function claimMessage(commitment: string, claimant: string): string {
  return hexOf(hash.computePoseidonHashOnElements([CLAIM_TAG, hexOf(commitment), hexOf(claimant)]));
}

export interface ClaimSignature {
  r: string;
  s: string;
}

/**
 * Signs a claim for one specific claimant address.
 */
export function signClaim(sk: string, commitment: string, claimant: string): ClaimSignature {
  const message = claimMessage(commitment, claimant);
  const signature = ec.starkCurve.sign(message, hexOf(sk));
  return { r: hexOf(signature.r), s: hexOf(signature.s) };
}

const compactSignature = ({ r, s }: ClaimSignature): string =>
  r.replace(/^0x/, '').padStart(64, '0') + s.replace(/^0x/, '').padStart(64, '0');

/**
 * Local mirror of the contract's check, so the UI can fail before a transaction is signed rather
 * than after it reverts.
 *
 * Takes the uncompressed public key: the curve needs both coordinates to verify, whereas Cairo's
 * `check_ecdsa_signature` recovers what it needs from the Stark key alone.
 */
export function verifyClaim(
  fullPk: string,
  commitment: string,
  claimant: string,
  signature: ClaimSignature,
): boolean {
  const message = claimMessage(commitment, claimant);
  try {
    return ec.starkCurve.verify(compactSignature(signature), message, hexOf(fullPk));
  } catch {
    return false;
  }
}
