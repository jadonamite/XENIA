/**
 * Wallet discovery and STRK20 capability probing.
 *
 * STRK20 lives on the v6 Wallet API. Some wallets announce themselves through the Wallet Standard
 * registry; the established ones — Ready among them — still only inject a `window.starknet_*`
 * object and never register. Reading the registry alone therefore misses most of the field, and
 * the page reports "no wallet detected" to someone who has one installed.
 *
 * So we register the injected ones ourselves. `StarknetInjectedWallet` wraps an injected object in
 * the Wallet Standard shape, exposing exactly the `standard:connect` and `starknet:walletApi`
 * features the rest of this file expects. After that there is one code path, and `getWallets()`
 * sees every wallet in the browser.
 *
 * Not every Starknet wallet implements STRK20 yet and there is no published list, so we probe.
 * `wallet_strk20Balances` with an empty token list is a read that costs nothing and signs nothing:
 * a wallet that implements it answers with an empty array, one that does not rejects. Either way
 * the answer decides which path the UI offers, and it is observed rather than assumed.
 */

import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';
import { StarknetInjectedWallet } from '@starknet-io/get-starknet-wallet-standard-v6';

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

/** The shape an extension injects on `window`, reduced to what the adapter needs. */
type InjectedWallet = ConstructorParameters<typeof StarknetInjectedWallet>[0];

const isInjectedWallet = (value: unknown): value is InjectedWallet => {
  const candidate = value as Partial<InjectedWallet> | null;
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.request === 'function' &&
    typeof candidate.on === 'function'
  );
};

/** Extensions inject under their own key — `starknet_ready`, `starknet_braavos`, and so on. */
const injectedWallets = (): InjectedWallet[] =>
  Object.keys(window)
    .filter((key) => key.startsWith('starknet'))
    .map((key) => (window as unknown as Record<string, unknown>)[key])
    .filter(isInjectedWallet);

const wrapped = new Set<string>();

/**
 * Wraps every injected wallet the page can see into the Wallet Standard registry.
 *
 * Idempotent, and skips anything already registered under the same name so a wallet that does both
 * is not offered twice.
 */
export function registerInjectedWallets(): void {
  if (typeof window === 'undefined') return;
  const registry = getWallets();
  const known = new Set(registry.get().map((wallet) => wallet.name));
  for (const injected of injectedWallets()) {
    if (wrapped.has(injected.id) || known.has(injected.name)) continue;
    try {
      registry.register(new StarknetInjectedWallet(injected));
      wrapped.add(injected.id);
    } catch {
      // A wallet that refuses to be wrapped is one we cannot drive. Leave it out rather than
      // offering a button that fails on click.
    }
  }
}

/** Every Starknet wallet the page can see, injected or self-registered. */
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
 * Watches the registry. Extensions inject asynchronously, so a page that only looks once on mount
 * misses whichever one was slowest to load — we rescan on a short schedule as well as on the
 * registry's own events.
 */
export function onWalletsChanged(listener: (wallets: StarknetWallet[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const registry = getWallets();
  const emit = () => {
    registerInjectedWallets();
    listener(discoverWallets());
  };
  const offRegister = registry.on('register', emit);
  const offUnregister = registry.on('unregister', emit);
  const retries = [0, 250, 1000].map((delay) => window.setTimeout(emit, delay));
  window.addEventListener('load', emit);
  emit();
  return () => {
    offRegister();
    offUnregister();
    retries.forEach(window.clearTimeout);
    window.removeEventListener('load', emit);
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
