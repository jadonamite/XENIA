'use client';

import { useCallback, useEffect, useState } from 'react';
import { claimActions } from '@/lib/xenia/actions';
import { formatAmount, toHex } from '@/lib/xenia/amount';
import { ESCROW_ADDRESS, POOL_FEE, POOL_FEE_TOKEN, TOKENS } from '@/lib/xenia/config';
import { signClaim, signPublicClaim, type LinkKey } from '@/lib/xenia/crypto';
import { readClaimFromLocation } from '@/lib/xenia/link';
import {
  publicClaimCall,
  readClaim,
  relayPublicClaim,
  statusOf,
  type ClaimEntry,
} from '@/lib/xenia/escrow';
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
  const [needsPublic, setNeedsPublic] = useState(false);
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
      const raw = cause instanceof Error ? cause.message : String(cause);
      // The recipient has never used private balances. Not a failure of the link, and not
      // something this page can do for them: the Wallet API has no registration method, so it has
      // to happen in the wallet. Say so, rather than showing a protocol error code.
      if (/NOT_REGISTERED/i.test(raw)) {
        // Not a failure of the link. Offer the path that needs nothing of them.
        setNeedsPublic(true);
        setBusy(false);
        return;
      }
      setLoadError(cause instanceof Error ? cause.message : 'Could not read the escrow');
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    if (key) void refresh(key.commitment);
  }, [key, refresh]);

  /**
   * Paid in ordinary tokens, straight from the escrow.
   *
   * For a recipient who has never used private balances. The pool can only credit a note to
   * someone with a viewing key on chain, and only they can publish one — so this path skips the
   * pool entirely. Nothing is required of them but an address and enough gas to sign.
   *
   * The trade, stated on the button: this transfer is public, so their address is visible. The
   * sender stays hidden either way.
   */
  async function claimPublicly() {
    setError(null);
    if (!wallet.account || !key) return;
    setBusy(true);
    try {
      const signature = signPublicClaim(key.sk, key.commitment, wallet.account.address);

      // Try the relayer first: the link key already authorised this, and the signature names the
      // destination, so submitting it costs the recipient nothing and risks nothing. Only if
      // relaying is unavailable do we ask them to pay their own gas.
      const relayed = await relayPublicClaim(key.pk, wallet.account.address, signature);
      const { transaction_hash } =
        relayed ?? (await wallet.account.execute(publicClaimCall(key.pk, wallet.account.address, signature)));
      setTxHash(transaction_hash);
      await refresh(key.commitment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

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
          // The pool reimburses its fee with a withdrawal, and every token has to net zero across
          // the transaction. Someone claiming for the first time has nothing inside the pool for
          // that withdrawal to come out of, so the fee rides in as a deposit here.
          fee: { token: POOL_FEE_TOKEN, amount: toHex(POOL_FEE) },
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
                Connect any Starknet wallet. If you already use private balances you will be paid
                privately; if you have never touched them, you can still be paid — see below.
              </p>
              <WalletBar wallet={wallet} />
              {error && <p className="error">{error}</p>}

              {needsPublic ? (
                <>
                  {/*
                    Not a failure. The pool can only credit a private note to someone who has
                    published a viewing key, and only they can publish it — so this wallet cannot
                    be paid privately without a one-time setup. It can be paid publicly right now.
                  */}
                  <p className="note" style={{ marginTop: 16 }}>
                    This wallet has never used private balances, so it cannot receive a private
                    payment yet. Two ways forward:
                  </p>
                  <div className="row" style={{ marginTop: 16 }}>
                    <PillButton disabled={!wallet.account || busy} onClick={claimPublicly}>
                      {busy ? 'Waiting for the wallet…' : 'Claim as ordinary tokens'}
                    </PillButton>
                  </div>
                  <p className="note" style={{ marginTop: 10, opacity: 0.8 }}>
                    Paid straight to your wallet, nothing to set up. This transfer is public, so
                    your address will be visible receiving it — the sender stays hidden either way.
                  </p>
                  <p className="note" style={{ marginTop: 14, opacity: 0.8 }}>
                    Or set up private balances once in your wallet — in Ready, shield any amount
                    from its privacy section — then reload this page and claim privately instead.
                    The money stays here until you decide.
                  </p>
                </>
              ) : (
                <div className="row" style={{ marginTop: 16 }}>
                  <PillButton disabled={!wallet.account || busy} onClick={claim}>
                    {busy ? 'Waiting for the wallet…' : 'Claim'}
                  </PillButton>
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
