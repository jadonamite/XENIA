'use client';

import { useCallback, useEffect, useState } from 'react';
import { claimActions } from '@/lib/xenia/actions';
import { formatAmount } from '@/lib/xenia/amount';
import { ESCROW_ADDRESS, TOKENS } from '@/lib/xenia/config';
import { signClaim, type LinkKey } from '@/lib/xenia/crypto';
import { readClaimFromLocation } from '@/lib/xenia/link';
import { readClaim, statusOf, type ClaimEntry } from '@/lib/xenia/escrow';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { WalletBar } from '@/components/WalletBar';
import { PillButton } from '@/components/site/Pill';

const tokenLabel = (address: string) => {
  const known = TOKENS.find((t) => BigInt(t.address) === BigInt(address));
  return known ?? { symbol: 'tokens', decimals: 18, address };
};

export default function ClaimPage() {
  const wallet = useWalletContext();
  const [key, setKey] = useState<LinkKey | null>(null);
  const [ready, setReady] = useState(false);
  const [entry, setEntry] = useState<ClaimEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // The key is in the fragment, which only exists client-side. Nothing here runs on the server.
  useEffect(() => {
    setKey(readClaimFromLocation());
    setReady(true);
  }, []);

  const refresh = useCallback(async (commitment: string) => {
    try {
      setEntry(await readClaim(commitment));
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not read the escrow');
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    if (key) void refresh(key.commitment);
  }, [key, refresh]);

  async function claim() {
    setError(null);
    if (!wallet.account || !key || !entry) return;
    setBusy(true);
    try {
      // Signed for this address specifically. A signature lifted from the calldata authorises the
      // address it names, which is not the thief's.
      const signature = signClaim(key.sk, key.commitment, wallet.account.address);
      const { transaction_hash } = await wallet.account.strk20InvokeTransaction(
        claimActions({
          escrow: ESCROW_ADDRESS,
          token: entry.token,
          claimant: wallet.account.address,
          pk: key.pk,
          signature,
        }),
      );
      setTxHash(transaction_hash);
      await refresh(key.commitment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <main className="app" />;

  if (!key) {
    return (
      <main className="app">
        <h1>That link is incomplete</h1>
        <p className="lede">
          The key travels after the <span className="mono">#</span>. Some apps cut a link short when
          they preview it — ask the sender to send it again, unshortened.
        </p>
      </main>
    );
  }

  if (txHash) {
    const token = entry ? tokenLabel(entry.token) : null;
    return (
      <main className="app">
        <h1 className="ok">Claimed</h1>
        <p className="lede">
          {entry && token
            ? `${formatAmount(entry.amount, token.decimals)} ${token.symbol} is now in your private balance.`
            : 'The funds are now in your private balance.'}
        </p>
        <p className="mono">{txHash}</p>
        <p className="note">
          Notes mature a few blocks after they are created, so give it a minute before spending.
        </p>
      </main>
    );
  }

  const status = statusOf(entry);
  const token = entry ? tokenLabel(entry.token) : null;

  return (
    <main className="app">
      <h1>You have been sent money privately</h1>

      {loadError && <p className="error">{loadError}</p>}

      {status === 'unknown' && !loadError && !checked && (
        <p className="lede">Looking this link up on Starknet…</p>
      )}

      {checked && !entry && !loadError && (
        <p className="lede">
          Nothing is locked against this link. It was already claimed and cleared, refunded to the
          sender, or the link is not a Xenia link.
        </p>
      )}

      {entry && token && (
        <>
          <div className="panel">
            <div className="note">Amount</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              {formatAmount(entry.amount, token.decimals)} {token.symbol}
            </div>
            <p className="note" style={{ marginBottom: 0 }}>
              {status === 'claimed' && 'This link has already been claimed.'}
              {status === 'expired' && 'This link expired and has gone back to the sender.'}
              {status === 'claimable' &&
                `Claimable until ${new Date(entry.expiry * 1000).toLocaleString()}.`}
            </p>
          </div>

          {status === 'claimable' && (
            <>
              <h2>Claim it</h2>
              <p className="note">
                Connect any Starknet wallet. If you have never used private balances before, the
                same transaction sets you up — there is no separate step.
              </p>
              <WalletBar wallet={wallet} />
              {error && <p className="error">{error}</p>}
              <div className="row" style={{ marginTop: 16 }}>
                <PillButton disabled={!wallet.account || busy} onClick={claim}>
                  {busy ? 'Waiting for the wallet…' : 'Claim'}
                </PillButton>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
