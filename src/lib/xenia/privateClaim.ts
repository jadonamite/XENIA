/**
 * Submits a private claim with no wallet at all — the link's own key is the entire identity.
 *
 * `deriveAccountKey` (crypto.ts) turns the link secret into a Starknet account the sender already
 * knew about at create-claim time, which is what lets the escrow pre-fund it. This module deploys
 * that account (paid from its own pre-funded balance, an ordinary signed transaction) and then
 * proves + submits the claim through the same SDK route validated end-to-end in
 * `scripts/probe-register-claim.ts` — except here the paymaster call is proxied through
 * `/api/paymaster` so the AVNU key never reaches the browser.
 *
 * The account's private key lives only in memory for the life of this call. It is derived fresh
 * from `sk` every time, never persisted.
 */

import { Account, RpcProvider, constants } from 'starknet';
import {
  createEmptyRegistry,
  createPrivateTransfers,
  IndexerDiscoveryProvider,
  ProvingServiceProofProvider,
} from '@starkware-libs/starknet-privacy-sdk';
import {
  AvnuPaymaster,
  CorePrivateTransfersProver,
  deriveViewingKey,
  SdkWallet,
} from '@starkware-libs/starknet-privacy-client';
import type { Strk20Action } from '@starkware-libs/starknet-privacy-client';

import { CHAIN, NETWORK, POOL_FEE_TOKEN } from './config.ts';
import { deriveAccountKey, ARGENT_CLASS_HASH } from './crypto.ts';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not configured for this build.`);
  return value;
}

/**
 * The passphrase every claim account's viewing key is derived from, salted with its own address.
 *
 * Fixed and public on purpose. It is not a secret — the secret is `sk`, which decides the address
 * this is salted with — but it *is* load-bearing: the pool holds notes encrypted to the key this
 * produces, so changing it would make every balance claimed beforehand undiscoverable. It is the
 * reason a wallet cannot show these funds, and the reason withdrawal has to happen here.
 */
export const CLAIM_ACCOUNT_PASSPHRASE = 'xenia-derived-identity-v1';

const PROVING_SERVICE_URL = process.env.NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL;
const DISCOVERY_URL = process.env.NEXT_PUBLIC_XENIA_DISCOVERY_URL;

/** Deploys the derived account if it is not live yet. Paid from its own pre-funded STRK balance —
 * an ordinary signed transaction, no paymaster needed for this step. */
async function ensureDeployed(provider: RpcProvider, account: Account, publicKey: string): Promise<void> {
  try {
    await provider.getClassHashAt(account.address);
    return; // already deployed
  } catch {
    // not deployed yet, expected for a first claim
  }
  const { transaction_hash } = await account.deployAccount({
    classHash: ARGENT_CLASS_HASH,
    constructorCalldata: ['0x0', publicKey, '0x1'],
    addressSalt: publicKey,
  });
  await provider.waitForTransaction(transaction_hash);
}

export interface PrivateClaimResult {
  transaction_hash: string;
  /** The derived account's address, so the UI can show it as "your private balance now lives at…". */
  claimantAddress: string;
}

/**
 * Runs any STRK20 action set *as the account a link owns*.
 *
 * Claiming was the first use and withdrawing is the second, but nothing here is specific to either:
 * the account, its viewing key and its proving setup are all determined by `sk`, so the caller only
 * has to say what it wants done.
 */
export async function submitAsClaimAccount(
  sk: string,
  buildActions: (claimantAddress: string) => Strk20Action[],
): Promise<PrivateClaimResult> {
  const provingServiceUrl = required('NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL', PROVING_SERVICE_URL);
  const discoveryUrl = required('NEXT_PUBLIC_XENIA_DISCOVERY_URL', DISCOVERY_URL);

  const identity = deriveAccountKey(sk);
  const provider = new RpcProvider({ nodeUrl: CHAIN.rpcUrl });
  const account = new Account({
    provider,
    address: identity.address,
    signer: identity.privateKey,
    cairoVersion: '1',
  });

  await ensureDeployed(provider, account, identity.publicKey);

  const currentBlock = await provider.getBlockNumber();
  const provingProvider = new ProvingServiceProofProvider(
    provingServiceUrl,
    NETWORK === 'mainnet' ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA,
    {
      nodeUrl: CHAIN.rpcUrl,
      poolAddress: CHAIN.poolAddress,
      // "latest" races the paymaster's own view of the chain head and gets rejected as too recent.
      blockIdentifier: { block_number: currentBlock - 10 } as never,
    },
  );
  const discoveryProvider = new IndexerDiscoveryProvider(discoveryUrl, CHAIN.poolAddress);

  const prover = new CorePrivateTransfersProver({
    signer: account.signer as never,
    address: identity.address,
    // Not a secret shared with anyone: it only ever salts a key already derived from `sk`, which
    // itself never leaves the browser.
    passphrase: CLAIM_ACCOUNT_PASSPHRASE,
    node: provider as never,
    discovery: discoveryProvider,
    prover: provingProvider,
    poolContractAddress: CHAIN.poolAddress,
    shadowAccountAnonymizerAddress: '0x0',
    storage: {
      loadRegistry: async () => createEmptyRegistry(),
      saveRegistry: async () => {},
    },
  });

  const paymaster = new AvnuPaymaster({
    // Same-origin proxy — see src/app/api/paymaster/route.ts. No apiKey here: it stays server-side.
    url: '/api/paymaster',
    feeMode: { mode: 'sponsored_private', poolFeeToken: POOL_FEE_TOKEN, tip: 'normal' },
    // The paymaster stores this on itself and calls it as `this.fetchFn(...)`, which rebinds `this`
    // to the paymaster instance. Browsers reject that with "Illegal invocation"; Node does not,
    // which is why the probe scripts never hit it. Bind it here rather than patching the vendored
    // package.
    fetch: globalThis.fetch.bind(globalThis),
  });

  const wallet = new SdkWallet({
    prover,
    paymaster,
    poolContractAddress: CHAIN.poolAddress,
    signer: account.signer as never,
    userAddress: identity.address,
  });

  const { transaction_hash } = await wallet.strk20InvokeTransaction(buildActions(identity.address));
  return { transaction_hash, claimantAddress: identity.address };
}

/**
 * Moves a claimed private balance back out to an ordinary public address.
 *
 * This has to live in Xenia rather than in the recipient's wallet, and the reason is not a missing
 * feature anywhere. The pool stores notes encrypted to a viewing key, and this account's was
 * derived from `xenia-derived-identity-v1` salted with its address — a wallet handed the account
 * key derives its own viewing key instead, decrypts nothing, and reports an empty private balance.
 * Only a client that reproduces the same derivation can see the notes, let alone spend them.
 *
 * **What can actually be withdrawn is the balance less the pool's fee**, because the fee is charged
 * as another withdrawal out of the same balance and the pool requires the transaction to net zero.
 * A claim worth exactly the fee yields nothing, and no amount of funding from outside changes that
 * — a deposit only lets you take back what you put in.
 */
export async function withdrawFromClaimAccount(
  sk: string,
  withdrawal: { token: string; amount: string; recipient: string },
): Promise<PrivateClaimResult> {
  const felt = (value: string) => `0x${BigInt(value).toString(16)}`;
  return submitAsClaimAccount(sk, () => [
    {
      type: 'withdraw',
      token: felt(withdrawal.token),
      amount: felt(withdrawal.amount),
      recipient: felt(withdrawal.recipient),
    },
  ]);
}

/**
 * What a claim account actually holds in the pool, for one token.
 *
 * Takes the address rather than the link, because the viewing key is derived from the address and
 * the passphrase alone — reading a balance needs no signing and therefore no private key. That also
 * makes it checkable from a script against a known account, which is the only way this path gets
 * exercised before someone relies on it.
 */
export async function privateBalanceOf(address: string, token: string): Promise<bigint> {
  const provingServiceUrl = required('NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL', PROVING_SERVICE_URL);
  const discoveryUrl = required('NEXT_PUBLIC_XENIA_DISCOVERY_URL', DISCOVERY_URL);
  void provingServiceUrl;

  const viewingKey = deriveViewingKey(CLAIM_ACCOUNT_PASSPHRASE, address);
  const discovery = new IndexerDiscoveryProvider(discoveryUrl, CHAIN.poolAddress);
  const { notes } = await createPrivateTransfers({
    account: { address, signer: undefined } as never,
    viewingKeyProvider: { getViewingKey: async () => viewingKey as never },
    discoveryProvider: discovery,
    poolContractAddress: CHAIN.poolAddress,
  } as never).discoverNotes({ tokens: [BigInt(token)] as never });

  const held = notes.get(token) ?? [];
  return held.reduce((sum: bigint, note: { amount: unknown }) => sum + BigInt(note.amount as string), 0n);
}

/** The same balance, for a caller holding the link rather than the address. */
export async function claimAccountBalance(sk: string, token: string): Promise<bigint> {
  return privateBalanceOf(deriveAccountKey(sk).address, token);
}
