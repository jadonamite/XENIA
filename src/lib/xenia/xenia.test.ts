import type { STRK20_ACTION } from 'starknet';
import { describe, expect, it } from 'vitest';
import {
  claimMessage,
  commitmentOf,
  generateLinkKey,
  linkKeyFromSecret,
  signClaim,
  verifyClaim,
} from './crypto';
import { buildClaimLink, readClaimFragment } from './link';
import { claimActions, createClaimActions, FIRST_OPEN_NOTE, OPERATION } from './actions';

const ALICE = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
const MALLORY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('link keys', () => {
  it('derives a stable public key and commitment from a secret', () => {
    const a = generateLinkKey();
    const b = linkKeyFromSecret(a.sk);
    expect(b.pk).toBe(a.pk);
    expect(b.commitment).toBe(a.commitment);
  });

  it('gives every link a distinct key', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateLinkKey().sk));
    expect(keys.size).toBe(50);
  });

  it('binds the commitment to the public key', () => {
    const key = generateLinkKey();
    expect(key.commitment).toBe(commitmentOf(key.pk));
    expect(key.commitment).not.toBe(key.pk);
  });
});

describe('claim signatures', () => {
  it('verifies for the address it was signed for', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    expect(verifyClaim(key.fullPk, key.commitment, ALICE, signature)).toBe(true);
  });

  it('does not verify for a different claimant', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    // The whole point: lifting the calldata gets you Alice's authorisation, not your own.
    expect(verifyClaim(key.fullPk, key.commitment, MALLORY, signature)).toBe(false);
  });

  it('does not verify against a different link', () => {
    const key = generateLinkKey();
    const other = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    expect(verifyClaim(other.fullPk, other.commitment, ALICE, signature)).toBe(false);
  });

  it('produces a different message per claimant', () => {
    const key = generateLinkKey();
    expect(claimMessage(key.commitment, ALICE)).not.toBe(claimMessage(key.commitment, MALLORY));
  });
});

describe('claim links', () => {
  it('round-trips through the fragment', () => {
    const key = generateLinkKey();
    const link = buildClaimLink('https://xenia.app', key.sk);
    const parsed = readClaimFragment(new URL(link).hash);
    expect(parsed?.commitment).toBe(key.commitment);
  });

  it('keeps the key out of the path and query', () => {
    const key = generateLinkKey();
    const url = new URL(buildClaimLink('https://xenia.app', key.sk));
    const bare = key.sk.replace(/^0x/, '');
    expect(url.pathname + url.search).not.toContain(bare);
    expect(url.hash).toContain(bare);
  });

  it('rejects a truncated or mistyped link instead of throwing', () => {
    expect(readClaimFragment('#not-a-key')).toBeNull();
    expect(readClaimFragment('#')).toBeNull();
    expect(readClaimFragment('#0x0')).toBeNull();
  });
});

describe('action lists', () => {
  const escrow = '0x0abc';
  const token = '0x0def';

  /** Narrows the action union so a shape assertion is a compile error, not just a test failure. */
  const invokeAt = (actions: STRK20_ACTION[], index: number) => {
    const action = actions[index];
    if (action.type !== 'invoke') throw new Error(`action ${index} is ${action.type}, not invoke`);
    return action;
  };
  const withdrawAt = (actions: STRK20_ACTION[], index: number) => {
    const action = actions[index];
    if (action.type !== 'withdraw') throw new Error(`action ${index} is ${action.type}, not withdraw`);
    return action;
  };

  it('creates a claim by withdrawing to the escrow, then invoking it', () => {
    const actions = createClaimActions({
      escrow,
      token,
      amount: '0x64',
      commitment: '0x11',
      expiry: 1893456000,
      refundTo: ALICE,
    });
    expect(actions.map((a) => a.type)).toEqual(['withdraw', 'invoke']);
    expect(withdrawAt(actions, 0).recipient).toBe(escrow);
    expect(invokeAt(actions, 1).calldata).toEqual([
      OPERATION.Deposit,
      '0x11',
      token,
      '0x64',
      `0x${(1893456000).toString(16)}`,
      ALICE,
    ]);
  });

  it('claims with an open note and the wallet placeholder', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    const actions = claimActions({ escrow, token, claimant: ALICE, pk: key.pk, signature });
    expect(actions[0]).toMatchObject({ type: 'transfer', amount: 'OPEN', recipient: ALICE });
    expect(invokeAt(actions, 1).calldata).toEqual([
      OPERATION.Claim,
      key.pk,
      ALICE,
      signature.r,
      signature.s,
      FIRST_OPEN_NOTE,
    ]);
  });

  it('passes the public key, never the secret', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    const actions = claimActions({ escrow, token, claimant: ALICE, pk: key.pk, signature });
    expect(JSON.stringify(actions)).not.toContain(key.sk.replace(/^0x/, ''));
  });
});
