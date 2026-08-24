'use client';

import { useCallback, useEffect, useState } from 'react';
import { refundActions } from '@/lib/xenia/actions';
import { formatAmount } from '@/lib/xenia/amount';
import { ESCROW_ADDRESS } from '@/lib/xenia/config';
import { buildClaimLink } from '@/lib/xenia/link';
import { readClaim, statusOf, type ClaimStatus } from '@/lib/xenia/escrow';
import { forgetClaim, loadClaims, type StoredClaim } from '@/lib/xenia/store';
import { tokenBySymbol } from '@/lib/xenia/config';
import { useWallet } from '@/lib/xenia/useWallet';
import { WalletBar } from '@/components/WalletBar';

const LABEL: Record<ClaimStatus, string> = {
  unknown: 'checking…',
  claimable: 'unclaimed',
  claimed: 'claimed',
  expired: 'expired',
};

export default function ClaimsPage() {
  const wallet = useWallet();
  const [claims, setClaims] = useState<StoredClaim[]>([]);
  const [status, setStatus] = useState<Record<string, ClaimStatus>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const stored = loadClaims();
    setClaims(stored);
    // Local state is a cache, not the truth. Every row is confirmed against the chain, so a link
    // claimed on someone else's device still reads as claimed here.
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

  async function refund(claim: StoredClaim) {
    setError(null);
    if (!wallet.account) return;
    setBusy(claim.commitment);
    try {
      await wallet.account.strk20InvokeTransaction(
        refundActions({
          escrow: ESCROW_ADDRESS,
          token: claim.tokenAddress,
          refundTo: wallet.account.address,
          pk: claim.pk,
        }),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <main>
      <h1>My links</h1>
      <p className="lede">
        Kept in this browser. The money is on-chain either way — expiry and refund are keyed to your
        address, not to anything stored here.
      </p>

      <WalletBar wallet={wallet} />
      {error && <p className="error">{error}</p>}

      {claims.length === 0 ? (
        <p className="note" style={{ marginTop: 24 }}>
          Nothing yet. <a href="/create">Create a link</a>.
        </p>
      ) : (
        <table style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Expires</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const decimals = tokenBySymbol(claim.tokenSymbol)?.decimals ?? 18;
              const state = status[claim.commitment] ?? 'unknown';
              return (
                <tr key={claim.commitment}>
                  <td>
                    {formatAmount(BigInt(claim.amount), decimals)} {claim.tokenSymbol}
                  </td>
                  <td>{new Date(claim.expiry * 1000).toLocaleDateString()}</td>
                  <td className={state === 'claimed' ? 'ok' : undefined}>{LABEL[state]}</td>
                  <td>
                    <div className="row">
                      {state === 'claimable' && (
                        <button
                          className="ghost"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              buildClaimLink(window.location.origin, claim.sk),
                            )
                          }
                        >
                          Copy link
                        </button>
                      )}
                      {state === 'expired' && (
                        <button
                          disabled={!wallet.account || busy === claim.commitment}
                          onClick={() => refund(claim)}
                        >
                          {busy === claim.commitment ? 'Refunding…' : 'Refund'}
                        </button>
                      )}
                      {(state === 'claimed' || state === 'unknown') && (
                        <button className="ghost" onClick={() => { forgetClaim(claim.commitment); void load(); }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
