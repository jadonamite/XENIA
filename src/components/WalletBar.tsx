'use client';

import type { WalletState } from '@/lib/xenia/useWallet';

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
          <button className="ghost" onClick={wallet.disconnect}>
            Disconnect
          </button>
        </div>
        {wallet.probe && !wallet.probe.supportsStrk20 && (
          <p className="error" style={{ marginBottom: 0 }}>
            This wallet does not answer STRK20 calls{wallet.probe.reason ? ` — ${wallet.probe.reason}` : ''}.
            Switch to a wallet with private balances enabled.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="panel">
      {wallet.available.length === 0 ? (
        <p className="note" style={{ margin: 0 }}>
          No Starknet wallet detected in this browser.
        </p>
      ) : (
        <div className="row">
          {wallet.available.map((w) => (
            <button key={w.name} disabled={wallet.connecting} onClick={() => wallet.connect(w)}>
              {wallet.connecting ? 'Connecting…' : `Connect ${w.name}`}
            </button>
          ))}
        </div>
      )}
      {wallet.error && <p className="error">{wallet.error}</p>}
    </div>
  );
}
