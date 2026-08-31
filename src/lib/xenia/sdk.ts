import { createPrivateTransfers } from '@starkware-libs/starknet-privacy-sdk';
import type {
  PrivateTransfersInterface,
  PrivateTransfersUser,
  ViewingKey,
} from '@starkware-libs/starknet-privacy-sdk';
import { constants } from 'starknet';
import { CHAIN, NETWORK } from './config.ts';

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
  account: PrivateTransfersUser;
  viewingKey: ViewingKeySource;
}

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
