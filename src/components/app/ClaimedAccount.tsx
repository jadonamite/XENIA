'use client';

/**
 * The claimant's account, and the way out of it.
 *
 * A private claim does not pay into a wallet. It derives a Starknet account from the link, deploys
 * it, registers its viewing key with the pool, and pays *that* — so the funds are held by an
 * account the app builds and then, until this panel existed, threw away: `submitAsClaimAccount`
 * derives the key in memory and never persists it. The claimant owned real money through an
 * identity nobody had shown them.
 *
 * Handing over the key is not enough on its own, which is why the withdrawal lives here too. The
 * pool stores notes encrypted to a viewing key, and `privateClaim.ts` derives this account's from
 * `xenia-derived-identity-v1` salted with the address — that derivation is what is registered on
 * chain. A wallet given the account key derives its own viewing key instead, decrypts nothing, and
 * shows an empty private balance next to whatever public tokens the account holds. So importing
 * gives you the account but never a view of the money, and the only client that can spend it is one
 * reproducing the same derivation.
 *
 * The key is still shown, because it is the claimant's and because the link already implies it, but
 * it is the fallback rather than the route.
 */

import { useState } from 'react';
import { formatAmount, parseAmount, toHex } from '@/lib/xenia/amount';
import { POOL_FEE } from '@/lib/xenia/config';
import type { AccountKey } from '@/lib/xenia/crypto';
import { withdrawFromClaimAccount } from '@/lib/xenia/privateClaim';

const FEE = formatAmount(POOL_FEE, 18);
const ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

export interface ClaimedAccountProps {
  account: AccountKey;
  /** The link secret. Everything here is derived from it; it never leaves the browser. */
  sk: string;
  token: { symbol: string; decimals: number; address: string };
}

export function ClaimedAccount({ account, sk, token }: ClaimedAccountProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'address' | 'key' | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

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

  async function withdraw() {
    setError(null);
    if (!ADDRESS.test(recipient.trim())) {
      setError('Enter the Starknet address to send to, starting 0x.');
      return;
    }
    let units: bigint;
    try {
      units = parseAmount(amount, token.decimals);
    } catch {
      setError('Enter a valid amount.');
      return;
    }
    if (units <= 0n) {
      setError('Enter an amount above zero.');
      return;
    }

    setBusy(true);
    try {
      const { transaction_hash } = await withdrawFromClaimAccount(sk, {
        token: token.address,
        amount: toHex(units),
        recipient: recipient.trim(),
      });
      setSent(transaction_hash);
    } catch (cause) {
      // The pool's own refusal is the useful message — most often that the balance cannot cover the
      // amount *and* the fee, which is the failure people will actually hit.
      setError(cause instanceof Error ? cause.message : 'The withdrawal did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 24, textAlign: 'left' }}>
      <div className="note" style={{ marginBottom: 6 }}>Where your money is</div>
      <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.6 }}>
        This claim created a Starknet account from your link and paid into its private balance. The
        account is yours — the link is its key. Keep the link: it is what proves the account is
        yours, and what this page needs to spend from it.
      </p>

      {sent ? (
        <>
          <div className="note">Withdrawal sent</div>
          <p className="mono" style={{ margin: '4px 0 8px', wordBreak: 'break-all', fontSize: 13 }}>
            {sent}
          </p>
          <p className="note" style={{ marginBottom: 0 }}>
            It lands in a few blocks, as an ordinary {token.symbol} balance at the address you gave.
          </p>
        </>
      ) : (
        <>
          <div className="note">Withdraw to an address</div>
          <p style={{ margin: '4px 0 12px', fontSize: 14.5, lineHeight: 1.6 }}>
            Sends out of the pool as ordinary {token.symbol}, spendable anywhere. The pool charges{' '}
            {FEE} {token.symbol} for this, taken from the same balance — so you can withdraw what
            you hold less {FEE}.
          </p>

          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Destination address, 0x…"
            spellCheck={false}
            style={field}
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={`Amount in ${token.symbol}`}
            style={{ ...field, marginTop: 8 }}
          />

          {error && (
            <p className="error" style={{ marginTop: 10, marginBottom: 0 }}>
              {error}
            </p>
          )}

          <button type="button" disabled={busy} onClick={withdraw} style={{ ...btn(false), marginTop: 12 }}>
            {busy ? 'Proving and submitting… (about 30s)' : 'Withdraw'}
          </button>
        </>
      )}

      <div className="note" style={{ marginTop: 24 }}>Account address</div>
      <p className="mono" style={{ margin: '4px 0 8px', wordBreak: 'break-all', fontSize: 13 }}>
        {account.address}
      </p>
      <button type="button" onClick={() => copy('address', account.address)} style={btn(copied === 'address')}>
        {copied === 'address' ? '✓ Copied' : 'Copy address'}
      </button>

      <div className="note" style={{ marginTop: 20 }}>Private key</div>
      <p style={{ margin: '4px 0 8px', fontSize: 14, lineHeight: 1.6 }}>
        You do not need this to withdraw above. It proves the account is yours, and lets you use its
        public balance elsewhere — but a wallet you import it into will <strong>not</strong> show the
        private balance, because it derives a different viewing key and cannot decrypt these notes.
      </p>
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
        <button type="button" onClick={() => setRevealed(true)} style={btn(false)}>
          Reveal private key
        </button>
      )}

      <p className="note" style={{ marginTop: 18, marginBottom: 0, lineHeight: 1.6 }}>
        <strong>Anyone holding this key holds the money.</strong> Treat it like the link itself:
        never paste it into a website, a chat, or a support ticket.
      </p>
    </div>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  border: '1px solid var(--hairline, #dfe1e3)',
  borderRadius: 'var(--r-chip, 9px)',
  background: 'var(--card-raised, #fff)',
  color: 'inherit',
};

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
