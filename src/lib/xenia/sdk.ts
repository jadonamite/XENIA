/**
 * Wiring to the STRK20 SDK route — the path that can actually register a claimant, because the
 * Wallet API has no `register` action (see `actions.ts`).
 *
 * The prover and discovery URLs below are not published in any StarkWare doc. They were found by
 * GitHub-searching StarkWare's own app (`starkware-industries/pripay`, `server.js:19-26`) and
 * verified live against mainnet by `~/Projects/Inertia/projects/velum` on 2026-08-26 — that
 * project shielded a real balance through them before Xenia used them for anything. See
 * `contracts/ONCHAIN-FINDINGS.md` §6 for why the Wallet API route cannot register someone, and
 * `docs/PRIVATE-CLAIM-PROBE.md` for how this was proved end to end.
 *
 * `createPrivateTransfers` ties the registered identity to `account.address` — whoever signs is
 * whoever gets registered. So a relayer cannot silently register a stranger through this SDK; the
 * claimant's own connected wallet has to be the signer. That is not a limitation on top of the
 * product, it is the product: the recipient still never needs STRK20 wallet support, only an
 * ordinary signer, and the pool fee they'd otherwise have nothing to pay is already covered by
 * `XeniaEscrow`'s pre-funding (see `ClaimPrefunded` in `xenia_escrow.cairo`).
 */

import { createPrivateTransfers } from '@starkware-libs/starknet-privacy-sdk';
import type {
  PrivateTransfersInterface,
  PrivateTransfersUser,
  ViewingKey,
} from '@starkware-libs/starknet-privacy-sdk';
import { constants } from 'starknet';
import { CHAIN, NETWORK } from './config';

function requiredPublicEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — see .env.example`);
  }
  return value;
}

export interface SdkNetworkConfig {
  provingServiceUrl: string;
  discoveryUrl: string;
  nodeUrl: string;
  chainId: typeof constants.StarknetChainId.SN_MAIN | typeof constants.StarknetChainId.SN_SEPOLIA;
}

/** Read once; these are build-time `NEXT_PUBLIC_` values like the rest of `config.ts`. */
export function sdkNetworkConfig(): SdkNetworkConfig {
  return {
    provingServiceUrl: requiredPublicEnv('NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL'),
    discoveryUrl: requiredPublicEnv('NEXT_PUBLIC_XENIA_DISCOVERY_URL'),
    nodeUrl: requiredPublicEnv('NEXT_PUBLIC_XENIA_NODE_URL'),
    chainId:
      NETWORK === 'mainnet' ? constants.StarknetChainId.SN_MAIN : constants.StarknetChainId.SN_SEPOLIA,
  };
}

export interface ViewingKeySource {
  getViewingKey(): Promise<ViewingKey>;
}

export interface PrivateClaimClientParams {
  /** The claimant's own account — `{ address, signer }` is enough; a starknet.js `Account` or a
   * `WalletAccount` wrapping a connected browser wallet both satisfy this structurally. */
  account: PrivateTransfersUser;
  viewingKey: ViewingKeySource;
}

/**
 * Build an SDK client for one claimant. Every `execute()` on the result proves — including a
 * transaction with no deposit — so budget roughly 30 seconds and show that on screen; a silent
 * 30-second wait reads as a hang, which is exactly what sank the first attempt at this (see
 * `contracts/ONCHAIN-FINDINGS.md`'s note on why the Wallet API route was tried first).
 */
export function privateClaimClient(params: PrivateClaimClientParams): PrivateTransfersInterface {
  const config = sdkNetworkConfig();
  return createPrivateTransfers({
    account: params.account,
    viewingKeyProvider: { getViewingKey: () => params.viewingKey.getViewingKey() },
    provingProvider: {
      url: config.provingServiceUrl,
      chainId: config.chainId,
      nodeUrl: config.nodeUrl,
    },
    discoveryProvider: { url: config.discoveryUrl },
    poolContractAddress: CHAIN.poolAddress,
  });
}
