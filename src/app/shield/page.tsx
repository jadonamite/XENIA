'use client';

import { useState } from 'react';
import Link from 'next/link';
import { shieldActions } from '@/lib/xenia/actions';
import { isInconclusive } from '@/lib/xenia/escrow';
import { parseAmount, toHex } from '@/lib/xenia/amount';
import { NETWORK, POOL_FEE, TOKENS, tokenBySymbol } from '@/lib/xenia/config';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { SlideToPay } from '@/components/app/SlideToPay';
import { TokenSelect } from '@/components/ui/TokenSelect';

/**
 * Moving public funds into the privacy pool.
 *
 * Every other page assumes the sender already has a private balance — creating a claim withdraws
 * from the pool, and you cannot withdraw what was never deposited. Without this step the app is
 * unusable on a fresh account, and the alternative was sending people to third-party tooling that
 * may or may not target the same network.
 *
 * Deliberately plain: a deposit is one action, needs no proof, and the wallet obtains the
 * compliance screening the pool verifies on chain.
 */
export default function ShieldPage() {
  const wallet = useWalletContext();
  const [symbol, setSymbol] = useState(TOKENS[0].symbol as string);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const token = tokenBySymbol(symbol) ?? TOKENS[0];
  const feeInStrk = Number(POOL_FEE) / 1e18;

  async function shield() {
    setError(null);
    setTxHash(null);
    setNeedsRegistration(false);

    if (!wallet.account) {
      setError('Connect a wallet first.');
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
      const { transaction_hash } = await wallet.account.strk20InvokeTransaction(
        shieldActions({ token: token.address, amount: toHex(units) }),
      );
      setTxHash(transaction_hash);
      setAmount('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      // Unlike a claim, there is nothing public to check afterwards — a shielded balance is
      // readable only by its owner. So say what is actually known instead of calling it a failure.
      if (isInconclusive(cause)) {
        setError(
          'The wallet stopped waiting. The transaction may still have gone through — check your ' +
            'shielded balance in your wallet before shielding again, so you do not pay the fee ' +
            'twice. If the wallet is still asking you to approve it, dismiss that prompt rather ' +
            'than accepting it again.',
        );
        setBusy(false);
        return;
      }
      // The pool refuses to hold funds for an account with no viewing key on chain. Nothing the
      // app can do about it: the Wallet API exposes no way to register, so the wallet has to.
      if (/NOT_REGISTERED/i.test(message)) setNeedsRegistration(true);
      else setError(message || 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app" style={{ maxWidth: 520, padding: '36px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Shield</h1>
        <Link href="/create" className="note">
          Create a link →
        </Link>
      </div>

      <p className="note" style={{ marginTop: 0 }}>
        Moves funds from your wallet into the privacy pool. Xenia sends money that is already
        inside, so this comes first. <strong>This step is public</strong> — your address, the token
        and the amount are all visible. What happens afterwards is not.
      </p>

      {needsRegistration && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="note" style={{ margin: 0, fontWeight: 600 }}>
            This account has not registered with the pool yet.
          </p>
          <p className="note" style={{ marginTop: 8, marginBottom: 0 }}>
            Registering publishes a viewing key on chain, and only the account itself can do it —
            the Wallet API exposes no method for it, so it has to happen in your wallet. In Ready,
            open its privacy or shielded-balance section and complete the one-time setup, then come
            back and shield.
          </p>
          <p className="note" style={{ marginTop: 8, marginBottom: 0, opacity: 0.75 }}>
            This is the same wall Xenia exists to remove for <em>recipients</em> — a sender still
            has to cross it once.
          </p>
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <TokenSelect value={symbol} onChange={setSymbol} />

        <label className="note" style={{ display: 'block', margin: '18px 0 6px' }}>
          Amount
        </label>
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="0.0"
          style={{ width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 10 }}
        />

        <p className="note" style={{ marginTop: 14, opacity: 0.8 }}>
          The pool charges {feeInStrk} STRK per transaction on {NETWORK}. Shield comfortably more
          than you intend to send, so the claim and its fee both fit.
        </p>

        {error && (
          <p className="note" style={{ color: 'var(--bad, #b3261e)', marginTop: 12 }}>
            {error}
          </p>
        )}

        {txHash && (
          <p className="note" style={{ marginTop: 12 }}>
            Shielded. Transaction <code>{txHash.slice(0, 14)}…</code> — once it confirms, you can{' '}
            <Link href="/create">create a link</Link>.
          </p>
        )}

        <div style={{ marginTop: 18 }}>
          <SlideToPay
            onSuccess={shield}
            disabled={!wallet.account || !amount}
            loading={busy}
            label="Slide to shield"
            loadingLabel="Waiting for wallet…"
            disabledLabel={wallet.account ? 'Enter an amount' : 'Connect a wallet'}
          />
        </div>

      </div>
    </main>
  );
}
