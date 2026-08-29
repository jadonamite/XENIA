'use client';

/**
 * Wallet connection.
 *
 * One connected `WalletAccountV6` for the whole app. V6 is the version that carries the STRK20
 * methods; a wallet that only speaks V5 can still connect, and the probe is what tells the UI so.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RpcProvider, WalletAccountV6 } from 'starknet';
import { CHAIN } from './config';
import {
  onWalletsChanged,
  probeWalletWithin,
  type StarknetWallet,
  type WalletProbe,
} from './wallet';

export interface WalletState {
  available: StarknetWallet[];
  account: WalletAccountV6 | null;
  address: string | null;
  probe: WalletProbe | null;
  connecting: boolean;
  error: string | null;
  connect: (wallet: StarknetWallet) => Promise<void>;
  disconnect: () => void;
}

export function useWallet(): WalletState {
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
        // See `WalletContext`: the probe is a second wallet request that may never be answered,
        // and the button must not wait for it.
        setConnecting(false);
        setProbe(await probeWalletWithin(wallet));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not connect');
        setConnecting(false);
      }
    },
    [provider],
  );

  const disconnect = useCallback(() => {
    setAccount(null);
    setProbe(null);
  }, []);

  return {
    available,
    account,
    address: account?.address ?? null,
    probe,
    connecting,
    error,
    connect,
    disconnect,
  };
}
