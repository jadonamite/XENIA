'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClaimActions } from '@/lib/xenia/actions';
import { formatAmount, parseAmount, toHex } from '@/lib/xenia/amount';
import {
  DEFAULT_EXPIRY_SECONDS,
  ESCROW_ADDRESS,
  POOL_FEE,
  TOKENS,
  tokenBySymbol,
} from '@/lib/xenia/config';
import { deriveAccountKey, generateLinkKey } from '@/lib/xenia/crypto';
import { buildClaimLink } from '@/lib/xenia/link';
import { saveClaim } from '@/lib/xenia/store';
import { isInconclusive, STALE_PROMPT, waitForClaim } from '@/lib/xenia/escrow';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { ClaimLinkCard } from '@/components/ClaimLinkCard';
import { SlideToPay } from '@/components/app/SlideToPay';
import { TokenSelect } from '@/components/ui/TokenSelect';

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const EXPIRY_PRESETS = [
  { label: '1 Hour', seconds: HOUR },
  { label: '1 Day', seconds: DAY },
  { label: '7 Days', seconds: 7 * DAY },
  { label: '30 Days', seconds: 30 * DAY },
];

export default function CreatePage() {
  const wallet = useWalletContext();
  const [symbol, setSymbol] = useState(TOKENS[0].symbol as string);
  const [amount, setAmount] = useState('');
  const [expiryWindow, setExpiryWindow] = useState(DEFAULT_EXPIRY_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const token = tokenBySymbol(symbol) ?? TOKENS[0];


  async function create() {
    setError(null);
    setWarning(null);
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
    // A claim worth less than the fee to redeem it is a poor deal, but it is not invalid — and
    // refusing it outright blocks the case where the sender's own balance cannot stretch further.
    // The pool charges its fee on this transaction too, so a sender holding 10 STRK can create a
    // claim of at most 4. Warn, and let them decide.
    //
    // Say which claim this is about. The fee falls on a *private* redemption, where the recipient
    // pays the pool themselves. The public route costs them nothing at all — we relay it and cover
    // the gas — so a flat "this costs 6 STRK to redeem" is wrong for exactly the recipient who
    // most needs a small claim to be worth taking: the one arriving with an empty wallet.
    setWarning(
      token.symbol === 'STRK' && units < POOL_FEE
        ? `Redeeming this privately costs the recipient a ${formatAmount(POOL_FEE, 18)} STRK pool fee, which is more than the claim is worth. Claiming it publicly costs them nothing — Xenia pays the gas — so a first-time recipient is unaffected.`
        : null,
    );

    const expiry = Math.floor(Date.now() / 1000) + expiryWindow;

    const key = generateLinkKey();
    // The link's own key determines who claims — no wallet, no signature, just the link (see
    // crypto.ts). The sender can compute that address right now, which is what makes pre-funding
    // it possible: pay their pool fee and one-time account deployment out of the escrow's own
    // reserve, so a recipient who has never touched Starknet can still submit the claim themselves.
    const claimIdentity = deriveAccountKey(key.sk);
    const prefundAmount = POOL_FEE + 10n ** 18n; // fee + a small buffer for deployment gas

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
          prefund: { recipient: claimIdentity.address, amount: toHex(prefundAmount) },
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
      // A timeout is not a failure. The transaction is proved and relayed before it lands, so the
      // wallet can stop waiting while it goes on to succeed — and losing the link here would
      // strand real money that is sitting in the escrow.
      if (isInconclusive(cause)) {
        setError(null);
        setWaiting(true);
        const landed = await waitForClaim(key.commitment, (entry) => entry !== null);
        setWaiting(false);
        if (landed) {
          saveClaim({
            commitment: key.commitment,
            pk: key.pk,
            sk: key.sk,
            tokenSymbol: token.symbol,
            tokenAddress: token.address,
            amount: units.toString(),
            expiry,
            createdAt: Math.floor(Date.now() / 1000),
            txHash: '',
          });
          setLink(buildClaimLink(window.location.origin, key.sk));
          setWarning(STALE_PROMPT);
          setBusy(false);
          return;
        }
        setError(
          'The wallet stopped waiting and the claim has not appeared on chain yet. It may still ' +
            'land — check My Links in a minute before trying again, so you do not pay twice.',
        );
        setBusy(false);
        return;
      }
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <main className="app" style={{ maxWidth: 480, padding: '40px 20px 80px' }}>
        <ClaimLinkCard link={link} />
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p className="note" style={{ marginBottom: 16 }}>
            Locked {formatAmount(parseAmount(amount, token.decimals), token.decimals)} {token.symbol}.
            You can monitor this link under <Link href="/claims" style={{ color: 'var(--accent)', fontWeight: 600 }}>My Links</Link>.
          </p>
          <button
            onClick={() => {
              setLink(null);
              setAmount('');
            }}
            className="pill pill-plain"
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600 }}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Section 1: "To" Card */}
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
              borderRadius: 18,
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
                  Bearer Instrument &bull; No Starknet address required
                </div>
              </div>
            </div>

            <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>›</span>
          </div>
        </div>

        {/* Section 2: "Amount" Card */}
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
            {/* Input & Token Selector */}
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
                  width: '55%',
                  outline: 'none',
                  letterSpacing: '-0.02em',
                }}
              />

              <TokenSelect value={symbol} onChange={setSymbol} />
            </div>

            {/* What the pool takes, stated where the number is entered rather than buried */}
            <div
              style={{
                marginTop: 14,
                paddingTop: 10,
                borderTop: '1px solid var(--hairline)',
                fontSize: 12.5,
                color: 'var(--ink-3)',
              }}
            >
              Paid out of your private balance. Redeeming costs the recipient the pool&rsquo;s{' '}
              {formatAmount(POOL_FEE, 18)} STRK transaction fee.
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
              const isSelected = expiryWindow === preset.seconds;
              return (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => setExpiryWindow(preset.seconds)}
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
                    boxShadow: isSelected ? '0 2px 8px rgba(19, 145, 226, 0.15)' : 'none',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <p className="note" style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            After it expires the money stops being claimable and you can reclaim it from My Links.
            It is not automatic, and the link stays a bearer instrument — anyone still holding it
            can sweep an expired claim, so treat expiry as a deadline, not a lock.
          </p>
        </div>

        {/* Error message */}
        {warning && (

          <p className="note" style={{ color: 'var(--warn, #8a6100)', marginTop: 12 }}>

            {warning}

          </p>

        )}

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
