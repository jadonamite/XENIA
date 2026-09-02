'use client';

/**
 * Hands the claimant the account their money is actually in.
 *
 * A private claim does not pay into a wallet. It derives a Starknet account from the link, deploys
 * it, registers its viewing key with the pool, and pays *that* — so the funds are held by an
 * account the app builds and then, until this panel existed, threw away: `submitPrivateClaimNoWallet`
 * derives the key in memory and never persists it. The claimant owned real money through an
 * identity nobody had shown them.
 *
 * The link is the key, so this reveals nothing a holder of the link could not already compute. What
 * it removes is the requirement to compute it, which in practice meant running a script.
 *
 * What it does NOT do is make the balance visible in a wallet, and the panel says so. The pool
 * stores notes encrypted to a viewing key; `privateClaim.ts` derives this account's from the
 * passphrase `xenia-derived-identity-v1` salted with the address, and that derivation is what is
 * registered on chain. A wallet derives its own viewing key differently, so an imported account
 * shows its public balance and nothing else. Reaching the private balance means reproducing
 * Xenia's derivation — which, until a withdrawal screen exists, means Xenia.
 */

import { useState } from 'react';
import { formatAmount } from '@/lib/xenia/amount';
import { POOL_FEE } from '@/lib/xenia/config';
import type { AccountKey } from '@/lib/xenia/crypto';

const FEE = formatAmount(POOL_FEE, 18);

export function ClaimedAccount({ account }: { account: AccountKey }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'address' | 'key' | null>(null);

  async function copy(what: 'address' | 'key', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access is denied in some contexts. The value is on screen either way, so this is
      // a lost convenience rather than a lost key.
    }
  }

  return (
    <div className="panel" style={{ marginTop: 24, textAlign: 'left' }}>
      <div className="note" style={{ marginBottom: 6 }}>Where your money is</div>
      <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.6 }}>
        This claim created a Starknet account from your link and paid into its private balance. The
        account is yours — the link is its key. Keep the link: it is what proves the account is
        yours, and what any withdrawal will ask for.
      </p>

      <div className="note">Account address</div>
      <p className="mono" style={{ margin: '4px 0 8px', wordBreak: 'break-all', fontSize: 13 }}>
        {account.address}
      </p>
      <button
        type="button"
        onClick={() => copy('address', account.address)}
        style={btn(copied === 'address')}
      >
        {copied === 'address' ? '✓ Copied' : 'Copy address'}
      </button>

      <div className="note" style={{ marginTop: 20 }}>Private key</div>
      {revealed ? (
        <>
          <p className="mono" style={{ margin: '4px 0 8px', wordBreak: 'break-all', fontSize: 13 }}>
            {account.privateKey}
          </p>
          <button type="button" onClick={() => copy('key', account.privateKey)} style={btn(copied === 'key')}>
            {copied === 'key' ? '✓ Copied' : 'Copy private key'}
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: '4px 0 8px', fontSize: 14, color: 'var(--muted, #5E646E)' }}>
            Hidden until you ask for it, so it is not sitting on screen while you are elsewhere.
          </p>
          <button type="button" onClick={() => setRevealed(true)} style={btn(false)}>
            Reveal private key
          </button>
        </>
      )}

      <p className="note" style={{ marginTop: 20, marginBottom: 0, lineHeight: 1.6 }}>
        <strong>Anyone holding this key holds the money.</strong> Treat it like the link itself:
        never paste it into a website, a chat, or a support ticket.
      </p>

      <div className="note" style={{ marginTop: 20 }}>Reaching the balance</div>
      <p style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.7 }}>
        Importing this key into a wallet gives you the account, but{' '}
        <strong>not a view of its private balance</strong>. The pool keeps notes encrypted to a
        viewing key, and this account&rsquo;s was derived by Xenia; a wallet computes its own
        differently, so it will show only the public balance. Withdrawing has to go through Xenia,
        which can reproduce that derivation.
      </p>
      <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.7 }}>
        A withdrawal also costs the pool&rsquo;s {FEE} STRK fee, so what you can take out is the
        balance less {FEE} STRK. Anything paid into this account later shares that one fee.
      </p>
    </div>
  );
}

const btn = (done: boolean): React.CSSProperties => ({
  background: done ? '#10794a' : 'var(--accent, #1391E2)',
  color: '#fff',
  border: 0,
  borderRadius: 'var(--r-chip, 9px)',
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
});
