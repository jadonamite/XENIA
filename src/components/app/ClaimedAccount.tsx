'use client';

/**
 * The claimant's account, what it holds, and the way out of it.
 *
 * A private claim does not pay into a wallet. It derives a Starknet account from the link, deploys
 * it, registers its viewing key with the pool, and pays *that* — so the funds are held by an
 * account the app builds and then, until this panel existed, threw away: `submitAsClaimAccount`
 * derives the key in memory and never persists it. The claimant owned real money through an
 * identity nobody had shown them.
 *
 * Handing over the account key is not a way out on its own. The pool stores notes encrypted to a
 * viewing key derived from `CLAIM_ACCOUNT_PASSPHRASE` salted with the address, and that derivation
 * is what is registered on chain — so a wallet given the account key derives its own viewing key,
 * decrypts nothing, and shows an empty private balance beside whatever public tokens are there.
 * Only a client reproducing the derivation can see the notes, which is why both the balance and the
 * withdrawal live here.
 */

import { useEffect, useState } from 'react';
import { formatAmount, parseAmount, toHex } from '@/lib/xenia/amount';
import { POOL_FEE } from '@/lib/xenia/config';
import type { AccountKey } from '@/lib/xenia/crypto';
import { privateBalanceOf, withdrawFromClaimAccount } from '@/lib/xenia/privateClaim';

const ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

export interface ClaimedAccountProps {
  account: AccountKey;
  /** The link secret. Everything here derives from it; it never leaves the browser. */
  sk: string;
  token: { symbol: string; decimals: number; address: string };
}

type Destination = 'self' | 'other';

export function ClaimedAccount({ account, sk, token }: ClaimedAccountProps) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [destination, setDestination] = useState<Destination>('self');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'address' | 'key' | null>(null);

  // The balance is only readable by something that reproduces this account's viewing key, so it is
  // read here rather than left to the claimant to discover elsewhere. Address-only: reading needs
  // no signature.
  useEffect(() => {
    let live = true;
    privateBalanceOf(account.address, token.address)
      .then((held) => live && setBalance(held))
      .catch(() => live && setBalanceError(true));
    return () => {
      live = false;
    };
  }, [account.address, token.address]);

  /**
   * The fee is charged as a second withdrawal out of the same balance, and the pool requires the
   * transaction to net zero — so what can leave is always the balance less one fee, and a balance
   * at or below the fee can move nothing at all.
   */
  const withdrawable = balance === null ? null : balance > POOL_FEE ? balance - POOL_FEE : 0n;
  const fmt = (units: bigint) => formatAmount(units, token.decimals);

  async function copy(what: 'address' | 'key', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Denied in some contexts. The value is on screen either way — a lost convenience, not a
      // lost key.
    }
  }

  function take(fraction: number) {
    if (!withdrawable) return;
    const units = fraction === 1 ? withdrawable : (withdrawable * BigInt(Math.round(fraction * 100))) / 100n;
    setAmount(formatAmount(units, token.decimals));
  }

  async function withdraw() {
    setError(null);
    const to = destination === 'self' ? account.address : recipient.trim();
    if (!ADDRESS.test(to)) {
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
    if (withdrawable !== null && units > withdrawable) {
      setError(`The most you can withdraw is ${fmt(withdrawable)} ${token.symbol}, after the pool fee.`);
      return;
    }

    setBusy(true);
    try {
      const { transaction_hash } = await withdrawFromClaimAccount(sk, {
        token: token.address,
        amount: toHex(units),
        recipient: to,
      });
      setSent(transaction_hash);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The withdrawal did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 24, textAlign: 'left' }}>
      <div className="note" style={{ marginBottom: 6 }}>Your private balance</div>

      {balance === null && !balanceError && (
        <p style={{ margin: '0 0 16px', fontSize: 15 }}>Reading it from the pool…</p>
      )}
      {balanceError && (
        <p className="error" style={{ margin: '0 0 16px' }}>
          Could not read the balance just now. The money is unaffected — reload to try again.
        </p>
      )}
      {balance !== null && (
        <>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
            {fmt(balance)} {token.symbol}
          </div>
          <p className="note" style={{ margin: '4px 0 18px' }}>
            Held by an account this link created. Withdrawing costs the pool&rsquo;s{' '}
            {fmt(POOL_FEE)} {token.symbol} fee, so{' '}
            <strong>
              {fmt(withdrawable ?? 0n)} {token.symbol}
            </strong>{' '}
            can leave.
          </p>
        </>
      )}

      {sent ? (
        <>
          <div className="note">Withdrawal sent</div>
          <p className="mono" style={{ margin: '4px 0 8px', wordBreak: 'break-all', fontSize: 13 }}>
            {sent}
          </p>
          <p className="note" style={{ marginBottom: 0 }}>
            It lands in a few blocks as ordinary {token.symbol} at the address you chose.
          </p>
        </>
      ) : withdrawable === 0n ? (
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7 }}>
          This balance is not more than the {fmt(POOL_FEE)} {token.symbol} the pool charges to move
          it, so there is nothing you can withdraw. Every claim link creates its own account, so
          this one will not be topped up by a later payment — for a claim to be worth anything, it
          has to be sent for more than the fee.
        </p>
      ) : (
        <>
          <div className="note">Send it to</div>
          <div style={{ display: 'flex', gap: 8, margin: '6px 0 12px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setDestination('self')} style={choice(destination === 'self')}>
              This account
            </button>
            <button type="button" onClick={() => setDestination('other')} style={choice(destination === 'other')}>
              Another address
            </button>
          </div>

          {destination === 'self' ? (
            <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.6 }}>
              Unshields into this same account&rsquo;s ordinary balance, at{' '}
              <span className="mono" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>
                {account.address}
              </span>
              . Import the key below and any wallet will show it — public tokens need no viewing key.
            </p>
          ) : (
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Exchange deposit address, or any Starknet address, 0x…"
              spellCheck={false}
              style={{ ...field, marginBottom: 12 }}
            />
          )}

          <div className="note">Amount</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={`Amount in ${token.symbol}`}
            style={{ ...field, marginTop: 6 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {([['25%', 0.25], ['50%', 0.5], ['Max', 1]] as const).map(([label, fraction]) => (
              <button
                key={label}
                type="button"
                disabled={!withdrawable}
                onClick={() => take(fraction)}
                style={choice(false)}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <p className="error" style={{ marginTop: 10, marginBottom: 0 }}>
              {error}
            </p>
          )}

          <button type="button" disabled={busy} onClick={withdraw} style={{ ...btn(false), marginTop: 14 }}>
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
        Not needed to withdraw above. It proves the account is yours and lets you spend its public
        balance from a wallet — but a wallet will <strong>not</strong> show the private balance, since
        it derives a different viewing key and cannot decrypt these notes.
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

const choice = (on: boolean): React.CSSProperties => ({
  background: on ? 'var(--accent, #1391E2)' : 'transparent',
  color: on ? '#fff' : 'inherit',
  border: `1px solid ${on ? 'var(--accent, #1391E2)' : 'var(--hairline, #dfe1e3)'}`,
  borderRadius: 'var(--r-chip, 9px)',
  padding: '7px 13px',
  fontSize: 13.5,
  fontWeight: 500,
  cursor: 'pointer',
});

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
