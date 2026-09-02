import type { STRK20_ACTION } from 'starknet';
import { describe, expect, it } from 'vitest';
import {
  claimMessage,
  commitmentOf,
  deriveAccountKey,
  generateLinkKey,
  linkKeyFromSecret,
  refundMessage,
  signClaim,
  signRefund,
  verifyClaim,
  verifyRefund,
} from './crypto';
import { buildClaimLink, readClaimFragment } from './link';
import {
  claimActions,
  createClaimActions,
  FIRST_OPEN_NOTE,
  OPERATION,
  refundActions,
  shieldActions,
} from './actions';

/** The Wallet API rejects a leading zero after `0x`, so expectations use the canonical form. */
const felt = (value: string) => `0x${BigInt(value).toString(16)}`;

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

describe('the account a claim pays into', () => {
  /**
   * Pinned, not merely self-consistent.
   *
   * A private claim pays an account derived from the link and nothing else records where the money
   * went. The claimant reaches it by deriving the same key again — so if this derivation ever
   * changes, every balance claimed before the change becomes unreachable by anyone, permanently.
   * Asserting the exact output makes that failure loud instead of silent.
   */
  const SECRET = '0x1234567890abcdef';

  it('derives the same account from the same link, every time', () => {
    const account = deriveAccountKey(SECRET);
    expect(account.address).toBe(
      '0x2a74749248c911fd6e0c42926bd2a42ecaa92133dfd3ba72d3992b103f8ff25',
    );
    expect(account.publicKey).toBe(
      '0x4ee18ce62983499f696325e909963bc9d57aa09a4222de0efc2974e3b4ba1e',
    );
    expect(account.privateKey).toBe(
      '0x1c2a047fb399fc2d9a73319130556f86a2eefd9481de4ecbdf090fc6f572a07',
    );
    expect(deriveAccountKey(SECRET)).toEqual(account);
  });

  it('gives every link its own account', () => {
    const a = deriveAccountKey(generateLinkKey().sk);
    const b = deriveAccountKey(generateLinkKey().sk);
    expect(a.address).not.toBe(b.address);
    expect(a.privateKey).not.toBe(b.privateKey);
  });

  it('keeps the account key distinct from the link key it comes from', () => {
    // They authorise different things — the link key signs the claim, the account key pays the
    // gas and holds the note. Collapsing them would let one leak imply the other.
    const key = generateLinkKey();
    expect(deriveAccountKey(key.sk).privateKey).not.toBe(key.sk);
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

describe('refund signatures', () => {
  it('verifies for the address it was signed for', () => {
    const key = generateLinkKey();
    const signature = signRefund(key.sk, key.commitment, ALICE);
    expect(verifyRefund(key.fullPk, key.commitment, ALICE, signature)).toBe(true);
  });

  it('cannot be replayed as a claim, or a claim as a refund', () => {
    const key = generateLinkKey();
    // The two domain tags are the whole reason this holds.
    expect(refundMessage(key.commitment, ALICE)).not.toBe(claimMessage(key.commitment, ALICE));
    const refund = signRefund(key.sk, key.commitment, ALICE);
    expect(verifyClaim(key.fullPk, key.commitment, ALICE, refund)).toBe(false);
    const claim = signClaim(key.sk, key.commitment, ALICE);
    expect(verifyRefund(key.fullPk, key.commitment, ALICE, claim)).toBe(false);
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
  const FEE = { token: '0x0feee', amount: '0x1234' };

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

  /**
   * The entrypoint takes ten parameters and the pool deserialises positionally, so length is the
   * one property that must hold on every operation. Six felts against ten fails before the
   * contract's own code runs, which is exactly the failure that is hardest to read from a receipt.
   */
  const expectTenFelts = (calldata: readonly unknown[]) => expect(calldata).toHaveLength(10);

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
    expect(withdrawAt(actions, 0).recipient).toBe(felt(escrow));
    const calldata = invokeAt(actions, 1).calldata;
    expectTenFelts(calldata);
    expect(calldata).toEqual([
      OPERATION.Deposit,
      felt('0x11'),
      felt(token),
      '0x64',
      `0x${(1893456000).toString(16)}`,
      felt(ALICE),
      '0x0', // claimant — the pre-fund recipient, unused here
      '0x0', // sig_r
      '0x0', // sig_s
      '0x0', // note_id — the pre-fund amount, unused here
    ]);
  });

  it('carries pre-funding in the reused deposit positions', () => {
    const actions = createClaimActions({
      escrow,
      token,
      amount: '0x64',
      commitment: '0x11',
      expiry: 1893456000,
      refundTo: ALICE,
      prefund: { recipient: MALLORY, amount: '0x9' },
    });
    const calldata = invokeAt(actions, 1).calldata;
    expectTenFelts(calldata);
    // claimant and note_id, not appended fields — appending would change the length.
    expect(calldata[6]).toBe(felt(MALLORY));
    expect(calldata[9]).toBe('0x9');
  });

  it('claims with an open note and the wallet placeholder', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    const actions = claimActions({ escrow, token, claimant: ALICE, pk: key.pk, signature });
    expect(actions[0]).toMatchObject({
      type: 'transfer',
      amount: 'OPEN',
      recipient: felt(ALICE),
    });
    const calldata = invokeAt(actions, 1).calldata;
    expectTenFelts(calldata);
    expect(calldata).toEqual([
      OPERATION.Claim,
      felt(key.pk),
      '0x0', // token — the stored entry wins
      '0x0', // amount
      '0x0', // expiry
      '0x0', // refund_to
      felt(ALICE),
      signature.r,
      signature.s,
      FIRST_OPEN_NOTE,
    ]);
  });

  it('funds the pool fee with a deposit when the claimant has nothing inside', () => {
    const key = generateLinkKey();
    const signature = signClaim(key.sk, key.commitment, ALICE);
    const actions = claimActions({ escrow, token, claimant: ALICE, pk: key.pk, signature, fee: FEE });
    // The deposit has to come first: the pool nets each token across the transaction, and the fee
    // withdrawal has nothing to subtract from until it lands.
    expect(actions.map((a) => a.type)).toEqual(['deposit', 'transfer', 'invoke']);
    expect(actions[0]).toMatchObject({
      type: 'deposit',
      token: felt(FEE.token),
      amount: felt(FEE.amount),
    });
    expectTenFelts(invokeAt(actions, 2).calldata);
  });

  it('refunds under its own domain tag, to the address in the claimant position', () => {
    const key = generateLinkKey();
    const signature = signRefund(key.sk, key.commitment, ALICE);
    const actions = refundActions({ escrow, token, refundTo: ALICE, pk: key.pk, signature });
    expect(actions[0]).toMatchObject({
      type: 'transfer',
      amount: 'OPEN',
      recipient: felt(ALICE),
    });
    const calldata = invokeAt(actions, 1).calldata;
    expectTenFelts(calldata);
    expect(calldata).toEqual([
      OPERATION.Refund,
      felt(key.pk),
      '0x0',
      '0x0',
      '0x0',
      '0x0',
      felt(ALICE), // signed as the claimant parameter; refund_to gates nothing
      felt(signature.r),
      felt(signature.s),
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

/**
 * The exact values `contracts/tests/test_js_interop.cairo` asserts on the Cairo side.
 *
 * That suite proves the contract still produces the recorded constants. It cannot prove *this*
 * side still produces them too — change a domain tag or a hash call in `crypto.ts` and Cairo stays
 * green while every claim reverts on chain. Asserting the same constants from both languages makes
 * the check bidirectional: whichever side drifts, one of the two suites goes red.
 *
 * Regenerate with `contracts/scripts/js-reference.mjs`.
 */
describe('agreement with the deployed contract', () => {
  const SK = '0x03a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f';
  const CLAIMANT = '0x048f5f116ba486a079969bdc934846998f0099c11d58874cdb5983a7411addf4';

  /** Compared numerically, since the two sides pad hex differently. */
  const same = (actual: string, expected: string) => expect(BigInt(actual)).toBe(BigInt(expected));

  it('derives the public key Cairo expects', () => {
    same(
      linkKeyFromSecret(SK).pk,
      '0x6a1061177c2ac48f00771e7b40a46c8f12be1ca9d5d4a9fefb76742e8aee8c4',
    );
  });

  it('derives the commitment Cairo expects', () => {
    same(
      linkKeyFromSecret(SK).commitment,
      '0x121e2e8a3e39c976541c4aec0c9ba566dcb1af2d1bc5d473441bbc4851dba2b',
    );
  });

  it('builds the claim message Cairo expects', () => {
    same(
      claimMessage(linkKeyFromSecret(SK).commitment, CLAIMANT),
      '0x7b3325e71990a02c3861aec2e7166a7f39e3b703816da209694a2c9bc42f7c1',
    );
  });

  it('builds the refund message Cairo expects', () => {
    same(
      refundMessage(linkKeyFromSecret(SK).commitment, CLAIMANT),
      '0x147106a7b6069b7460d6ef016b37e47eb11d7942a12d3ac8d0d1b731f84cf8b',
    );
  });
});

/**
 * The Wallet API validates every address and amount against
 * `^0x(0|[a-fA-F1-9]{1}[a-fA-F0-9]{0,62})$` — a leading zero after `0x` is invalid.
 *
 * Starknet addresses are published padded to 64 digits almost everywhere, so passing one straight
 * through is the natural mistake, and the wallet answers `INVALID_REQUEST_PAYLOAD` without the
 * transaction ever reaching the chain. Nothing about that error says which field was wrong.
 */
describe('every value the wallet sees is a valid felt', () => {
  const FELT = /^0x(0|[a-fA-F1-9][a-fA-F0-9]{0,62})$/;
  const isPlaceholder = (value: string) => value.startsWith('${');

  const check = (actions: STRK20_ACTION[]) => {
    for (const action of actions) {
      for (const [field, value] of Object.entries(action)) {
        if (field === 'type' || field === 'calldata' || typeof value !== 'string') continue;
        if (value === 'OPEN' || isPlaceholder(value)) continue;
        expect(value, `${action.type}.${field}`).toMatch(FELT);
      }
      if (action.type === 'invoke') {
        action.calldata.forEach((entry, i) => {
          if (typeof entry !== 'string' || isPlaceholder(entry)) return;
          expect(entry, `calldata[${i}]`).toMatch(FELT);
        });
      }
    }
  };

  /** STRK's address, exactly as it is published — padded, and therefore rejected unnormalised. */
  const PADDED = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

  it('normalises padded inputs when creating a claim', () => {
    check(
      createClaimActions({
        escrow: PADDED,
        token: PADDED,
        amount: '0x64',
        commitment: PADDED,
        expiry: 1893456000,
        refundTo: PADDED,
        prefund: { recipient: PADDED, amount: '0x9' },
      }),
    );
  });

  it('normalises padded inputs when claiming, fee deposit included', () => {
    const key = generateLinkKey();
    check(
      claimActions({
        escrow: PADDED,
        token: PADDED,
        claimant: PADDED,
        pk: key.pk,
        signature: signClaim(key.sk, key.commitment, PADDED),
        fee: { token: PADDED, amount: '0x1234' },
      }),
    );
  });

  it('normalises padded inputs when refunding', () => {
    const key = generateLinkKey();
    check(
      refundActions({
        escrow: PADDED,
        token: PADDED,
        refundTo: PADDED,
        pk: key.pk,
        signature: signRefund(key.sk, key.commitment, PADDED),
      }),
    );
  });
});

describe('shielding', () => {
  it('is a single deposit action, with the felt normalised', () => {
    const PADDED = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
    const actions = shieldActions({ token: PADDED, amount: '0x64' });
    expect(actions).toEqual([
      { type: 'deposit', token: `0x${BigInt(PADDED).toString(16)}`, amount: '0x64' },
    ]);
  });
});
