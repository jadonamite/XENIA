'use client';

import { useState } from 'react';
import { createClaimActions } from '@/lib/xenia/actions';
import { formatAmount, parseAmount, toHex } from '@/lib/xenia/amount';
import { DEFAULT_EXPIRY_SECONDS, ESCROW_ADDRESS, TOKENS, tokenBySymbol } from '@/lib/xenia/config';
import { generateLinkKey } from '@/lib/xenia/crypto';
import { buildClaimLink } from '@/lib/xenia/link';
import { saveClaim } from '@/lib/xenia/store';
import { useWallet } from '@/lib/xenia/useWallet';
import { ClaimLinkCard } from '@/components/ClaimLinkCard';
import { WalletBar } from '@/components/WalletBar';
import { PillButton } from '@/components/site/Pill';

const DAY = 24 * 60 * 60;

export default function CreatePage() {
  const wallet = useWallet();
  const [symbol, setSymbol] = useState(TOKENS[0].symbol as string);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState(String(DEFAULT_EXPIRY_SECONDS / DAY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const token = tokenBySymbol(symbol) ?? TOKENS[0];

  async function create() {
    setError(null);
    if (!wallet.account) return;
    if (!ESCROW_ADDRESS) {
      setError('The escrow address is not configured for this build.');
      return;
    }

    let units: bigint;
    try {
      units = parseAmount(amount, token.decimals);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid amount');
      return;
    }
    if (units <= 0n) {
      setError('Enter an amount above zero.');
      return;
    }

    const expiry = Math.floor(Date.now() / 1000) + Number(days) * DAY;
    // Generated here and never sent anywhere. The chain sees its hash; the recipient sees the key.
    const key = generateLinkKey();

    setBusy(true);
    try {
      const { transaction_hash } = await wallet.account.strk20InvokeTransaction(
        createClaimActions({
          escrow: ESCROW_ADDRESS,
          token: token.address,
          amount: toHex(units),
          commitment: key.commitment,
          expiry,
          refundTo: wallet.account.address,
        }),
      );
      saveClaim({
        commitment: key.commitment,
        pk: key.pk,
        sk: key.sk,
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
        amount: units.toString(),
        expiry,
        createdAt: Math.floor(Date.now() / 1000),
        txHash: transaction_hash,
      });
      setLink(buildClaimLink(window.location.origin, key.sk));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <main className="app">
        <ClaimLinkCard link={link} />
        <p className="note">
          Sent {formatAmount(parseAmount(amount, token.decimals), token.decimals)} {token.symbol}.
          It appears under <a href="/claims">my links</a> until it is claimed or refunded.
        </p>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Create a claim link</h1>
      <p className="lede">
        The funds leave your private balance now and sit in escrow until somebody claims them or the
        expiry passes.
      </p>

      <WalletBar wallet={wallet} />

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="token">Token</label>
          <select id="token" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="days">Expires in (days)</label>
          <input
            id="days"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
          />
          <p className="note">After this, only you can move the funds, back to your own balance.</p>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="row" style={{ marginTop: 16 }}>
          <PillButton disabled={!wallet.account || busy || !amount} onClick={create}>
            {busy ? 'Waiting for the wallet…' : 'Lock funds and get a link'}
          </PillButton>
        </div>
      </div>
    </main>
  );
}
