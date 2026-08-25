'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClaimActions } from '@/lib/xenia/actions';
import { formatAmount, parseAmount, toHex } from '@/lib/xenia/amount';
import { DEFAULT_EXPIRY_SECONDS, ESCROW_ADDRESS, TOKENS, tokenBySymbol } from '@/lib/xenia/config';
import { generateLinkKey } from '@/lib/xenia/crypto';
import { buildClaimLink } from '@/lib/xenia/link';
import { saveClaim } from '@/lib/xenia/store';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { ClaimLinkCard } from '@/components/ClaimLinkCard';
import { SlideToPay } from '@/components/app/SlideToPay';

const DAY = 24 * 60 * 60;
const EXPIRY_PRESETS = [
  { label: '1 Day', days: '1' },
  { label: '3 Days', days: '3' },
  { label: '7 Days', days: '7' },
  { label: '30 Days', days: '30' },
];

export default function CreatePage() {
  const wallet = useWalletContext();
  const [symbol, setSymbol] = useState(TOKENS[0].symbol as string);
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState(String(DEFAULT_EXPIRY_SECONDS / DAY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const token = tokenBySymbol(symbol) ?? TOKENS[0];

  // Estimated STRK price or calculation helper
  const parsedValue = parseFloat(amount || '0');
  const usdValue = (parsedValue * (token.symbol === 'STRK' ? 0.45 : 2800)).toFixed(2);

  async function create() {
    setError(null);
    if (!wallet.account) {
      setError('Please connect your Starknet wallet first.');
      return;
    }
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
      <main className="app" style={{ maxWidth: 480, padding: '40px 20px 80px' }}>
        <ClaimLinkCard link={link} />
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p className="note">
            Locked {formatAmount(parseAmount(amount, token.decimals), token.decimals)} {token.symbol}.
            You can monitor this link under <Link href="/claims">My Links</Link>.
          </p>
          <button
            onClick={() => {
              setLink(null);
              setAmount('');
            }}
            className="pill pill-ghost pill-plain"
            style={{ marginTop: 12 }}
          >
            Create Another Link
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app" style={{ maxWidth: 480, padding: '36px 20px 80px' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
          Send Private Money
        </h1>
        <p className="small" style={{ marginTop: 6, color: 'var(--ink-2)' }}>
          Funds lock into escrow. Recipient claims in 1-tx with zero prior setup.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Section 1: "To" Card (matching screenshot) */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, display: 'block' }}>
            To
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: 16,
              background: 'var(--card-raised)',
              border: '1px solid var(--hairline)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>
                  Anyone with Claim Link
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  Bearer Instrument &bull; No Starknet address needed
                </div>
              </div>
            </div>

            <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>›</span>
          </div>
        </div>

        {/* Section 2: "Amount" Card (matching screenshot) */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, display: 'block' }}>
            Amount
          </label>
          <div
            style={{
              padding: '18px 18px 14px',
              borderRadius: 18,
              background: 'var(--card-raised)',
              border: '1px solid var(--hairline)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            {/* Top Row: Input & Token Selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(val);
                }}
                style={{
                  border: 0,
                  padding: 0,
                  fontSize: 36,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  background: 'transparent',
                  width: '60%',
                  outline: 'none',
                  letterSpacing: '-0.02em',
                }}
              />

              {/* Token Selector */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px 6px 8px',
                  borderRadius: 9999,
                  background: 'var(--card)',
                  border: '1px solid var(--hairline)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ⚡
                </div>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {TOKENS.map((t) => (
                    <option key={t.symbol} value={t.symbol}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom Row: USD Equivalent & Balance / MAX */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid var(--hairline)',
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>≈ ${usdValue} USD</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                  Balance: {wallet.account ? '100.00' : '—'} {token.symbol}
                </span>
                <button
                  type="button"
                  onClick={() => setAmount('25')}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: 0,
                    background: 'rgba(19, 145, 226, 0.12)',
                    color: 'var(--accent)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Expiry Preset Selector */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, display: 'block' }}>
            Expires In
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {EXPIRY_PRESETS.map((preset) => {
              const isSelected = days === preset.days;
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDays(preset.days)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 12,
                    border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--hairline)',
                    background: isSelected ? 'rgba(19, 145, 226, 0.08)' : 'var(--card-raised)',
                    color: isSelected ? 'var(--accent)' : 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 160ms ease',
                    textAlign: 'center',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="note" style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            Unclaimed funds auto-refund exclusively to your address upon expiration.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(194, 56, 47, 0.08)',
              border: '1px solid rgba(194, 56, 47, 0.2)',
              color: '#c2382f',
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Section 4: Classic Slide to Pay Button */}
        <div style={{ marginTop: 8 }}>
          <SlideToPay
            onSuccess={create}
            disabled={!wallet.account || busy || !amount || parseFloat(amount) <= 0}
            loading={busy}
            label="Slide to Lock & Pay →"
            loadingLabel="Locking funds in escrow…"
            disabledLabel={!wallet.account ? 'Connect wallet to pay' : !amount ? 'Enter amount to pay' : 'Slide to Lock & Pay'}
          />
        </div>
      </div>
    </main>
  );
}
