'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RpcProvider, WalletAccountV6 } from 'starknet';
import { CHAIN } from './config';
import { onWalletsChanged, probeWallet, type StarknetWallet, type WalletProbe } from './wallet';
import type { WalletState } from './useWallet';

const WalletContext = createContext<WalletState | null>(null);

/**
 * Which wallet was last connected, so a reload does not drop the session.
 *
 * The extension keeps its own approval for the site, so reconnecting to a remembered wallet does
 * not prompt again — it just hands the account back. Without this, every refresh threw the user
 * back to the picker and made them sign afresh, which is intolerable mid-flow.
 *
 * Wrapped because storage throws in private windows and when site data is blocked, and a wallet
 * that cannot be remembered should still be usable.
 */
const REMEMBERED = 'xenia.wallet';

const remember = (name: string | null) => {
  try {
    if (name === null) window.localStorage.removeItem(REMEMBERED);
    else window.localStorage.setItem(REMEMBERED, name);
  } catch {
    // Not being able to remember is a lesser problem than not being able to connect.
  }
};

const remembered = (): string | null => {
  try {
    return window.localStorage.getItem(REMEMBERED);
  } catch {
    return null;
  }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<StarknetWallet[]>([]);
  const [account, setAccount] = useState<WalletAccountV6 | null>(null);
  const [probe, setProbe] = useState<WalletProbe | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => new RpcProvider({ nodeUrl: CHAIN.rpcUrl }), []);

  useEffect(() => onWalletsChanged(setAvailable), []);

  const connect = useCallback(
    async (wallet: StarknetWallet) => {
      setConnecting(true);
      setError(null);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connected = await WalletAccountV6.connect(provider, wallet as any);
        setAccount(connected);
        remember(wallet.name);
        setProbe(await probeWallet(wallet));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not connect');
      } finally {
        setConnecting(false);
      }
    },
    [provider],
  );

  const disconnect = useCallback(() => {
    setAccount(null);
    setProbe(null);
    remember(null);
  }, []);

  /**
   * Restore the previous session once the wallet that served it turns up.
   *
   * Extensions register asynchronously, so this runs whenever the available list changes rather
   * than once on mount. `restored` guards against a second attempt: a wallet the user has since
   * revoked would otherwise be retried on every re-render.
   */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || account || connecting) return;
    const name = remembered();
    if (!name) return;
    const wallet = available.find((w) => w.name === name);
    if (!wallet) return;

    restored.current = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const connected = await WalletAccountV6.connect(provider, wallet as any);
        setAccount(connected);
        // Deliberately not probing here. `wallet_strk20Balances` makes Ready ask permission to
        // share shielded assets, and doing that on a silent restore means a consent modal on every
        // single page load — for a capability check the user never asked for. The probe runs on an
        // explicit connect, where a prompt is expected, and its answer does not change on reload.
      } catch {
        // Approval revoked, or the wallet is locked. Forget it and show the picker, silently —
        // this was not something the user asked for, so it should not surface as an error.
        remember(null);
      }
    })();
  }, [available, account, connecting, provider]);

  const value = useMemo<WalletState>(
    () => ({
      available,
      account,
      address: account?.address ?? null,
      probe,
      connecting,
      error,
      connect,
      disconnect,
    }),
    [available, account, probe, connecting, error, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletContext(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}
