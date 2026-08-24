/**
 * Wallet discovery and STRK20 capability probing.
 *
 * STRK20 lives on the v6 Wallet API, and v6 wallets announce themselves through the Wallet
 * Standard registry rather than the old `window.starknet_*` injection. `getWallets()` reads that
 * registry, so a wallet that arrives late still shows up through `on('register')`.
 *
 * Not every Starknet wallet implements STRK20 yet and there is no published list, so we probe.
 * `wallet_strk20Balances` with an empty token list is a read that costs nothing and signs nothing:
 * a wallet that implements it answers with an empty array, one that does not rejects. Either way
 * the answer decides which path the UI offers, and it is observed rather than assumed.
 */

import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';

export const STRK20_METHODS = {
  balances: 'wallet_strk20Balances',
  prepareInvoke: 'wallet_strk20PrepareInvoke',
  invoke: 'wallet_strk20InvokeTransaction',
} as const;

const WALLET_API_FEATURE = 'starknet:walletApi';
const CONNECT_FEATURE = 'standard:connect';

type RequestFeature = { request: (call: { type: string; params?: unknown }) => Promise<unknown> };

/** A Wallet Standard wallet that carries the Starknet features we need. */
export type StarknetWallet = Wallet & {
  features: Record<string, unknown>;
};

export interface WalletProbe {
  wallet: StarknetWallet;
  name: string;
  /** The wallet answered a STRK20 read. The Wallet API route is open. */
  supportsStrk20: boolean;
  /** Why not, when it isn't. Shown in the UI rather than swallowed. */
  reason?: string;
}

const walletApi = (wallet: StarknetWallet): RequestFeature | undefined =>
  wallet.features[WALLET_API_FEATURE] as RequestFeature | undefined;

/** Every Starknet wallet currently in the Wallet Standard registry. */
export function discoverWallets(): StarknetWallet[] {
  if (typeof window === 'undefined') return [];
  return getWallets()
    .get()
    .filter(
      (wallet): wallet is StarknetWallet =>
        CONNECT_FEATURE in wallet.features && WALLET_API_FEATURE in wallet.features,
    );
}

/**
 * Watches the registry. Wallets register asynchronously, so a page that only reads once on mount
 * will miss whichever extension was slowest to load.
 */
export function onWalletsChanged(listener: (wallets: StarknetWallet[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const registry = getWallets();
  const emit = () => listener(discoverWallets());
  const offRegister = registry.on('register', emit);
  const offUnregister = registry.on('unregister', emit);
  emit();
  return () => {
    offRegister();
    offUnregister();
  };
}

/** Asks one wallet whether it speaks STRK20. Read-only: nothing is signed, nothing is spent. */
export async function probeWallet(wallet: StarknetWallet): Promise<WalletProbe> {
  const name = wallet.name;
  const api = walletApi(wallet);
  if (!api) {
    return { wallet, name, supportsStrk20: false, reason: 'No Starknet wallet API' };
  }
  try {
    await api.request({ type: STRK20_METHODS.balances, params: { tokens: [] } });
    return { wallet, name, supportsStrk20: true };
  } catch (error) {
    return {
      wallet,
      name,
      supportsStrk20: false,
      reason: error instanceof Error ? error.message : 'Not implemented',
    };
  }
}

/** Probes everything the page can see, in parallel. */
export function probeWallets(): Promise<WalletProbe[]> {
  return Promise.all(discoverWallets().map(probeWallet));
}
