'use client';

import { useCallback, useEffect, useState } from 'react';
import { claimActions } from '@/lib/xenia/actions';
import { formatAmount, toHex } from '@/lib/xenia/amount';
import { ESCROW_ADDRESS, POOL_FEE, POOL_FEE_TOKEN, TOKENS } from '@/lib/xenia/config';
import {
  deriveAccountKey,
  signClaim,
  signPublicClaim,
  type AccountKey,
  type LinkKey,
} from '@/lib/xenia/crypto';
import { readClaimFromLocation } from '@/lib/xenia/link';
import { submitPrivateClaimNoWallet } from '@/lib/xenia/privateClaim';
import {
  isInconclusive,
  isRegistered,
  publicClaimCall,
  readClaim,
  relayPublicClaim,
  statusOf,
  waitForClaim,
  type ClaimEntry,
} from '@/lib/xenia/escrow';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { WalletBar } from '@/components/WalletBar';
import { PillButton } from '@/components/site/Pill';
import { ClaimedAccount } from '@/components/app/ClaimedAccount';

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
  /**
   * Set only by the private route, because only that route pays an account the claimant does
   * not already have. A public or wallet claim lands in the wallet they just connected, so
   * handing them a key there would be noise at best and a second secret to lose at worst.
   */
  const [claimAccount, setClaimAccount] = useState<AccountKey | null>(null);

  /**
   * Whether this account can be paid privately, read from the pool rather than from the wallet.
   *
   * The connect probe answers this too, but it cannot run on a silent session restore — asking the
   * wallet costs a consent prompt, and firing that on page load is what made the extension pop up
   * on every visit. So reloading used to lose the answer and hide the public payout until the
   * visitor disconnected and reconnected.
   *
   * Reading the pool needs no wallet and no permission, so it survives a reload.
   */
  const [unregistered, setUnregistered] = useState(false);
  useEffect(() => {
    const address = wallet.account?.address;
    if (!address) {
      setUnregistered(false);
      return;
    }
    let current = true;
    isRegistered(address)
      .then((registered) => {
        if (current) setUnregistered(!registered);
      })
      .catch(() => {
        // If the pool cannot be read, fall back to the probe rather than guessing.
        if (current) setUnregistered(wallet.probe?.needsRegistration === true);
      });
    return () => {
      current = false;
    };
  }, [wallet.account?.address, wallet.probe]);

  const offerPublic = needsPublic || unregistered;
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
      if (await settledDespite(cause)) return;
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
      if (await settledDespite(cause)) return;
      setError(cause instanceof Error ? cause.message : 'The wallet rejected the transaction.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * A timeout is not a failure — the transaction may have landed while the wallet stopped waiting.
   * The contract knows; ask it rather than guessing from the error.
   *
   * Returns true when the claim did in fact settle, so the caller can stop treating it as a
   * problem.
   */
  async function settledDespite(cause: unknown): Promise<boolean> {
    if (!key || !isInconclusive(cause)) return false;
    setError(null);
    const settled = await waitForClaim(key.commitment, (entry) => entry?.claimed === true);
    if (settled) {
      await refresh(key.commitment);
      return true;
    }
    setError(
      'The wallet stopped waiting and the claim has not settled on chain yet. It may still land — ' +
        'reload in a minute before trying again, so you do not pay twice.',
    );
    return true;
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


  /**
   * The actual product: register and claim privately with no wallet at all. The link's own key is
   * the identity (crypto.ts's `deriveAccountKey`), pre-funded by the sender at create-claim time,
   * proven and submitted through the SDK route validated in `scripts/probe-register-claim.ts`.
   */
  async function claimPrivateNoWallet() {
    setError(null);
    if (!key || !entry) return;
    setBusy(true);
    try {
      const { transaction_hash } = await submitPrivateClaimNoWallet(key.sk, (claimantAddress) => {
        const signature = signClaim(key.sk, key.commitment, claimantAddress);
        return claimActions({
          escrow: ESCROW_ADDRESS,
          token: entry.token,
          claimant: claimantAddress,
          pk: key.pk,
          signature,
          fee: { token: POOL_FEE_TOKEN, amount: toHex(POOL_FEE) },
        });
      });
      setTxHash(transaction_hash);
      setClaimAccount(deriveAccountKey(key.sk));
      await refresh(key.commitment);
    } catch (cause) {
      if (await settledDespite(cause)) return;
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not complete the private claim. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }
  /**
   * Re-offer the account when someone comes back to their own link.
   *
   * `claimAccount` is set by the claim itself, which means it only survived as long as that browser
   * tab did. But coming back to the link later is exactly how a recipient retrieves their money —
   * and they would have found a page saying "already claimed" and nothing else, with no way to
   * reach funds they own.
   *
   * Which route was used is readable from the chain rather than remembered: only the private claim
   * registers the link's derived account with the pool. A public or wallet claim leaves it
   * unregistered, and correctly shows nothing here, because that money went to a wallet they
   * already have.
   */
  useEffect(() => {
    if (!key || claimAccount || statusOf(entry) !== 'claimed') return;
    let live = true;
    const account = deriveAccountKey(key.sk);
    isRegistered(account.address)
      .then((registered) => {
        if (live && registered) setClaimAccount(account);
      })
      .catch(() => {
        // A failed read is not evidence either way; leave the panel hidden rather than guess.
      });
    return () => {
      live = false;
    };
  }, [key, entry, claimAccount]);

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
        {claimAccount && <ClaimedAccount account={claimAccount} />}
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

          {status === 'claimed' && claimAccount && <ClaimedAccount account={claimAccount} />}

          {status === 'claimable' && (
            <>
              <h2>Claim it</h2>
              <p className="note">
                No wallet needed. The link itself is your key — claiming registers you privately
                and pays you in the same transaction.
              </p>
              {error && <p className="error">{error}</p>}

              <div className="row" style={{ marginTop: 16 }}>
                <PillButton disabled={busy} onClick={claimPrivateNoWallet}>
                  {busy ? 'Proving and submitting… (about 30s)' : 'Claim privately'}
                </PillButton>
              </div>
              <p className="note" style={{ marginTop: 10, opacity: 0.8 }}>
                This proves and registers a private balance for you behind the scenes. It takes
                about 30 seconds — that is normal, not a hang.
              </p>

              <details style={{ marginTop: 20 }}>
                <summary className="note" style={{ cursor: 'pointer' }}>
                  Have a Starknet wallet you already use for private balances?
                </summary>
                <div style={{ marginTop: 12 }}>
                  <WalletBar wallet={wallet} />
                  {offerPublic ? (
                    <>
                      <p className="note" style={{ marginTop: 16 }}>
                        This wallet has never used private balances. You can still be paid
                        publicly with it:
                      </p>
                      <div className="row" style={{ marginTop: 16 }}>
                        <PillButton disabled={!wallet.account || busy} onClick={claimPublicly}>
                          {busy ? 'Waiting for the wallet…' : 'Claim as ordinary tokens'}
                        </PillButton>
                      </div>
                      <p className="note" style={{ marginTop: 10, opacity: 0.8 }}>
                        Paid straight to your wallet, nothing to set up. This transfer is public,
                        so your address will be visible receiving it — the sender stays hidden
                        either way.
                      </p>
                    </>
                  ) : (
                    <div className="row" style={{ marginTop: 16 }}>
                      <PillButton disabled={!wallet.account || busy} onClick={claim}>
                        {busy ? 'Waiting for the wallet…' : 'Claim into this wallet instead'}
                      </PillButton>
                    </div>
                  )}
                </div>
              </details>
            </>
          )}
        </>
      )}
    </main>
  );
}
