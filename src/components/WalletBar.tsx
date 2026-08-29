'use client';

import type { WalletState } from '@/lib/xenia/useWallet';
import { rejectedWallets } from '@/lib/xenia/wallet';
import { PillButton } from '@/components/site/Pill';

/**
 * Connection, and an honest read on what the connected wallet can actually do.
 *
 * The STRK20 support line is a probe result, not a guess — see `wallet.ts`.
 */
export function WalletBar({ wallet }: { wallet: WalletState }) {
  if (wallet.address) {
    return (
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="note">{wallet.probe?.name ?? 'Connected'}</div>
            <div className="mono">{wallet.address}</div>
          </div>
          <PillButton variant="ghost" className="pill-plain" onClick={wallet.disconnect}>
            Disconnect
          </PillButton>
        </div>
        {/*
          Neutral on purpose. On the claim page a public payout is offered right below this, so
          telling someone their only option is to go and set something up would be wrong there.
          The page that needs the instruction gives it.
        */}
        {wallet.probe?.needsRegistration && (
          <p className="note" style={{ marginBottom: 0 }}>
            This account has not set up private balances. The wallet itself is fine.
          </p>
        )}
        {wallet.probe && !wallet.probe.supportsStrk20 && (
          <p className="error" style={{ marginBottom: 0 }}>
            This wallet does not answer STRK20 calls{wallet.probe.reason ? ` — ${wallet.probe.reason}` : ''}.
            Switch to a wallet with private balances enabled.
          </p>
        )}
      </div>
    );
  }

  const rejected = wallet.available.length === 0 ? rejectedWallets() : [];

  return (
    <div className="panel">
      {wallet.available.length === 0 ? (
        <div>
          <p className="note" style={{ margin: 0 }}>
            No Starknet wallet detected in this browser.
          </p>
          {/*
            A wallet that is present but cannot be driven used to look exactly like no wallet at
            all. Saying which one and why turns an unanswerable report into an obvious one.
          */}
          {rejected.length > 0 && (
            <p className="note" style={{ margin: '8px 0 0', opacity: 0.75 }}>
              Found, but not usable:{' '}
              {rejected.map((r) => `${r.key} (${r.reason})`).join('; ')}
            </p>
          )}
        </div>
      ) : (
        <div className="row">
          {wallet.available.map((w) => (
            <PillButton
              key={w.name}
              disabled={wallet.connecting}
              onClick={() => wallet.connect(w)}
            >
              {wallet.connecting ? 'Connecting…' : `Connect ${w.name}`}
            </PillButton>
          ))}
        </div>
      )}
      {wallet.error && <p className="error">{wallet.error}</p>}
    </div>
  );
}
