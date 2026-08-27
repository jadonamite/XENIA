'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { refundActions } from '@/lib/xenia/actions';
import { formatAmount, toHex } from '@/lib/xenia/amount';
import { ESCROW_ADDRESS, POOL_FEE, POOL_FEE_TOKEN } from '@/lib/xenia/config';
import { buildClaimLink } from '@/lib/xenia/link';
import { signRefund } from '@/lib/xenia/crypto';
import { readClaim, statusOf, type ClaimStatus } from '@/lib/xenia/escrow';
import { forgetClaim, loadClaims, type StoredClaim } from '@/lib/xenia/store';
import { tokenBySymbol } from '@/lib/xenia/config';
import { useWalletContext } from '@/lib/xenia/WalletContext';

const STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string; bg: string }> = {
  unknown: { label: 'Checking…', color: 'var(--ink-3)', bg: 'var(--card)' },
  claimable: { label: 'Active / Unclaimed', color: 'var(--accent)', bg: 'rgba(19, 145, 226, 0.1)' },
  claimed: { label: 'Claimed', color: '#10794a', bg: 'rgba(16, 121, 74, 0.1)' },
  expired: { label: 'Expired (Refundable)', color: '#c2382f', bg: 'rgba(194, 56, 47, 0.1)' },
};

export default function ClaimsPage() {
  const wallet = useWalletContext();
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  const [status, setStatus] = useState<Record<string, ClaimStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const stored = loadClaims();
    setClaims(stored);
    const results = await Promise.all(
      stored.map(async (claim) => {
        try {
          return [claim.commitment, statusOf(await readClaim(claim.commitment))] as const;
        } catch {
          return [claim.commitment, 'unknown' as ClaimStatus] as const;
        }
      }),
    );
    setStatus(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async (sk: string, commitment: string) => {
    await navigator.clipboard.writeText(buildClaimLink(window.location.origin, sk));
    setCopiedKey(commitment);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  async function refund(claim: StoredClaim) {
    setError(null);
    if (!wallet.account) {
      setError('Please connect the sender wallet to refund.');
      return;
    }
    setBusy(claim.commitment);
    try {
      // The contract cannot see who sent a refund — the pool is always its caller — so a refund is
      // authorised the same way a claim is: by a signature under the link key, over the address
      // being paid, under the refund domain tag.
      const signature = signRefund(claim.sk, claim.commitment, wallet.account.address);
      await wallet.account.strk20InvokeTransaction(
        refundActions({
          escrow: ESCROW_ADDRESS,
          token: claim.tokenAddress,
          refundTo: wallet.account.address,
          pk: claim.pk,
          signature,
          fee: { token: POOL_FEE_TOKEN, amount: toHex(POOL_FEE) },
        }),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the refund transaction.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="app" style={{ maxWidth: 680, padding: '36px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
            My Links
          </h1>
          <p className="small" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
            Links created in this browser &bull; Monitored live on Starknet
          </p>
        </div>

        <Link
          href="/create"
          className="pill pill-plain"
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
        >
          + New Link
        </Link>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(194, 56, 47, 0.08)',
            border: '1px solid rgba(194, 56, 47, 0.2)',
            color: '#c2382f',
            fontSize: 13.5,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {claims.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            borderRadius: 18,
            background: 'var(--card-raised)',
            border: '1px solid var(--hairline)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--card)',
              margin: '0 auto 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
            }}
          >
            ⚡
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>No claim links yet</h3>
          <p className="small" style={{ maxWidth: 360, margin: '8px auto 18px', color: 'var(--ink-2)' }}>
            Create your first private claim link to send money to anyone with zero prior setup.
          </p>
          <Link href="/create" className="pill">
            <span className="pill-text">Create a claim link</span>
            <span className="pill-chip" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {claims.map((claim) => {
            const decimals = tokenBySymbol(claim.tokenSymbol)?.decimals ?? 18;
            const state = status[claim.commitment] ?? 'unknown';
            const badge = STATUS_CONFIG[state] ?? STATUS_CONFIG.unknown;
            const isCopied = copiedKey === claim.commitment;

            return (
              <div
                key={claim.commitment}
                style={{
                  padding: '18px 20px',
                  borderRadius: 16,
                  background: 'var(--card-raised)',
                  border: '1px solid var(--hairline)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                      {formatAmount(BigInt(claim.amount), decimals)} {claim.tokenSymbol}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                    <span>Expires {new Date(claim.expiry * 1000).toLocaleDateString()}</span>
                    <span className="mono" style={{ color: 'var(--ink-3)' }}>
                      Key: {claim.commitment.slice(0, 8)}…
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {state === 'claimable' && (
                    <button
                      className="pill pill-plain"
                      onClick={() => copyLink(claim.sk, claim.commitment)}
                      style={{
                        padding: '7px 14px',
                        fontSize: 12.5,
                        background: isCopied ? '#10794a' : 'var(--pill)',
                      }}
                    >
                      {isCopied ? '✓ Copied' : 'Copy Link'}
                    </button>
                  )}

                  {state === 'expired' && (
                    <button
                      className="pill pill-plain"
                      disabled={!wallet.account || busy === claim.commitment}
                      onClick={() => refund(claim)}
                      style={{ padding: '7px 14px', fontSize: 12.5 }}
                    >
                      {busy === claim.commitment ? 'Refunding…' : 'Claim Refund'}
                    </button>
                  )}

                  <button
                    className="pill pill-ghost pill-plain"
                    onClick={() => {
                      forgetClaim(claim.commitment);
                      void load();
                    }}
                    style={{ padding: '7px 12px', fontSize: 12.5 }}
                    title="Remove from local list"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
