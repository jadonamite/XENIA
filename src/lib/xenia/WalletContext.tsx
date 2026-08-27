'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RpcProvider, WalletAccountV6 } from 'starknet';
import { CHAIN } from './config';
import { onWalletsChanged, probeWallet, type StarknetWallet, type WalletProbe } from './wallet';
import type { WalletState } from './useWallet';

const WalletContext = createContext<WalletState | null>(null);

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
  }, []);

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
