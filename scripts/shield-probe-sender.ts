/**
 * One-off: shield some of the probe sender's public STRK into the Sepolia pool, so
 * probe-register-claim.ts has a private balance to withdraw from when it creates a claim.
 *
 * Submission does not go through a plain `account.execute()` — the pool's `apply_actions` reads a
 * custom `proof_facts` field a normal signed transaction never carries. It has to arrive through an
 * AVNU paymaster, which is the only party that can attach it. Mirrors velum/scripts/shield.ts,
 * which proved this pattern against a real transaction first.
 *
 *   node --experimental-strip-types --dns-result-order=ipv4first --env-file=.env.local scripts/shield-probe-sender.ts
 */
import { Account, RpcProvider, constants } from 'starknet';
import {
  createEmptyRegistry,
  IndexerDiscoveryProvider,
  ProvingServiceProofProvider,
} from '@starkware-libs/starknet-privacy-sdk';
import { AvnuPaymaster, CorePrivateTransfersProver, SdkWallet } from '@starkware-libs/starknet-privacy-client';
import { CHAIN, NETWORK, POOL_FEE_TOKEN } from '../src/lib/xenia/config.ts';
import { shieldActions } from '../src/lib/xenia/actions.ts';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

async function main() {
  if (NETWORK !== 'sepolia') throw new Error('sepolia only for now');

  const address = required('XENIA_PROBE_SENDER_ADDRESS');
  const privateKey = required('XENIA_PROBE_SENDER_PRIVATE_KEY');
  const paymasterUrl = required('AVNU_PAYMASTER_URL');
  const paymasterApiKey = required('AVNU_PAYMASTER_API_KEY');
  const provingServiceUrl = required('NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL');
  const discoveryUrl = required('NEXT_PUBLIC_XENIA_DISCOVERY_URL');

  const provider = new RpcProvider({ nodeUrl: CHAIN.rpcUrl });
  const account = new Account({ provider, address, signer: privateKey, cairoVersion: '1' });

  const amount = 50n * 10n ** 18n; // 50 STRK
  console.log(`shielding 50 STRK into the pool for ${address}`);

  // "latest" races the paymaster's own view of the chain head — by the time proving finishes and
  // the paymaster checks the proof, "latest" has moved past what it still accepts. Prove a few
  // blocks behind head instead, matching PRD §5.3's documented `currentBlock - 10`.
  const currentBlock = await provider.getBlockNumber();
  const provingProvider = new ProvingServiceProofProvider(provingServiceUrl, constants.StarknetChainId.SN_SEPOLIA, {
    nodeUrl: CHAIN.rpcUrl,
    poolAddress: CHAIN.poolAddress,
    blockIdentifier: { block_number: currentBlock - 10 } as never,
  });
  const discoveryProvider = new IndexerDiscoveryProvider(discoveryUrl, CHAIN.poolAddress);

  const prover = new CorePrivateTransfersProver({
    signer: account.signer as never,
    address,
    passphrase: 'probe-sender-passphrase',
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
    url: paymasterUrl,
    apiKey: paymasterApiKey,
    feeMode: { mode: 'sponsored_private', poolFeeToken: POOL_FEE_TOKEN, tip: 'normal' },
  });

  const wallet = new SdkWallet({
    prover,
    paymaster,
    poolContractAddress: CHAIN.poolAddress,
    signer: account.signer as never,
    userAddress: address,
  });

  console.log('\nproving and submitting via the AVNU paymaster — this takes ~30s, it has not hung');
  const { transaction_hash } = await wallet.strk20InvokeTransaction(
    shieldActions({ token: POOL_FEE_TOKEN, amount: amount.toString() }),
  );

  console.log(`\nshielded. transaction: ${transaction_hash}`);
  console.log(`${CHAIN.explorer}/tx/${transaction_hash}`);
  await provider.waitForTransaction(transaction_hash);
  console.log('confirmed');
}

main().catch((error) => {
  console.error(`\nfailed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
