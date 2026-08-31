/**
 * Probe: does a never-registered account actually register-and-claim in one proven transaction,
 * against `XeniaEscrow`, through the SDK route?
 *
 * This is the entire thesis of the product (PRD §1, README's headline). It needs an AVNU
 * paymaster — the pool's `apply_actions` requires a `proof_facts` field a plain signed transaction
 * never carries, and only a paymaster can attach it (see docs/PRIVATE-CLAIM-PROBE.md history).
 * `CorePrivateTransfersProver` always sets `autoRegister: true`, and accepts the exact same
 * `STRK20_ACTION[]` shape `actions.ts` already produces for the Wallet API route — so this reuses
 * `createClaimActions` / `claimActions` unchanged. The only thing that differs from the live claim
 * page is which object provides `strk20InvokeTransaction`.
 *
 *   node --dns-result-order=ipv4first --experimental-strip-types --env-file=.env.local scripts/probe-register-claim.ts
 *
 * Needs in `.env.local` (see .env.example): two Sepolia Argent v0.4.0 accounts (no guardian — a
 * guardian blocks scripted signing entirely), one already shielded (run shield-probe-sender.ts
 * first), one never registered; plus AVNU_PAYMASTER_URL / AVNU_PAYMASTER_API_KEY.
 */

import { Account, RpcProvider, constants } from 'starknet';
import {
  createEmptyRegistry,
  IndexerDiscoveryProvider,
  ProvingServiceProofProvider,
} from '@starkware-libs/starknet-privacy-sdk';
import { AvnuPaymaster, CorePrivateTransfersProver, SdkWallet } from '@starkware-libs/starknet-privacy-client';

import { CHAIN, ESCROW_ADDRESS, NETWORK, POOL_FEE, POOL_FEE_TOKEN } from '../src/lib/xenia/config.ts';
import { generateLinkKey, signClaim } from '../src/lib/xenia/crypto.ts';
import { createClaimActions, claimActions } from '../src/lib/xenia/actions.ts';

const DECIMALS = 18n;
const toWei = (amount: string): bigint => {
  const [whole, fraction = ''] = amount.trim().split('.');
  return BigInt(whole + fraction.padEnd(Number(DECIMALS), '0').slice(0, Number(DECIMALS)));
};
const fromWei = (wei: bigint): string =>
  `${wei / 10n ** DECIMALS}.${(wei % 10n ** DECIMALS).toString().padStart(Number(DECIMALS), '0').slice(0, 4)}`;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example`);
  return value;
}

/** One `SdkWallet` per account — each needs its own signer, viewing-key passphrase, and prover
 * pinned to a safe (not-"latest") proving block, or the paymaster rejects the proof as too recent. */
async function walletFor(
  provider: RpcProvider,
  account: Account,
  passphrase: string,
  paymasterUrl: string,
  paymasterApiKey: string,
) {
  const currentBlock = await provider.getBlockNumber();
  const provingProvider = new ProvingServiceProofProvider(
    required('NEXT_PUBLIC_XENIA_PROVING_SERVICE_URL'),
    constants.StarknetChainId.SN_SEPOLIA,
    {
      nodeUrl: CHAIN.rpcUrl,
      poolAddress: CHAIN.poolAddress,
      blockIdentifier: { block_number: currentBlock - 10 } as never,
    },
  );
  const discoveryProvider = new IndexerDiscoveryProvider(
    required('NEXT_PUBLIC_XENIA_DISCOVERY_URL'),
    CHAIN.poolAddress,
  );

  const prover = new CorePrivateTransfersProver({
    signer: account.signer as never,
    address: account.address,
    passphrase,
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

  return new SdkWallet({
    prover,
    paymaster,
    poolContractAddress: CHAIN.poolAddress,
    signer: account.signer as never,
    userAddress: account.address,
  });
}

async function main() {
  if (NETWORK !== 'sepolia') {
    console.error('Run this on Sepolia first. Mainnet costs real STRK per attempt.');
    process.exit(2);
  }
  if (!ESCROW_ADDRESS) throw new Error('NEXT_PUBLIC_XENIA_ESCROW is not set');

  const provider = new RpcProvider({ nodeUrl: CHAIN.rpcUrl });
  const paymasterUrl = required('AVNU_PAYMASTER_URL');
  const paymasterApiKey = required('AVNU_PAYMASTER_API_KEY');

  const sender = new Account({
    provider,
    address: required('XENIA_PROBE_SENDER_ADDRESS'),
    signer: required('XENIA_PROBE_SENDER_PRIVATE_KEY'),
    cairoVersion: '1',
  });
  const claimant = new Account({
    provider,
    address: required('XENIA_PROBE_CLAIMANT_ADDRESS'),
    signer: required('XENIA_PROBE_CLAIMANT_PRIVATE_KEY'),
    cairoVersion: '1',
  });

  console.log(`network      ${NETWORK}`);
  console.log(`escrow       ${ESCROW_ADDRESS}`);
  console.log(`sender       ${sender.address}`);
  console.log(`claimant     ${claimant.address}  (must be never-registered for this to mean anything)`);

  // Matches the sender's shielded note exactly (shield-probe-sender.ts deposited 50, minus fees
  // netted by the paymaster) so the withdraw consumes the whole note — the STRK20_ACTION surface
  // `createClaimActions` builds against has no "surplus/change" action, so a partial withdrawal
  // that leaves a note fragment behind fails to compile.
  // Note is 48 STRK; the compiler also reserves the sender's own 2 STRK pool fee for this
  // transaction, so the withdrawable claim amount is 48 - 2.
  const amount = toWei('46');
  const link = generateLinkKey();
  console.log(`\nclaim amount ${fromWei(amount)} STRK`);
  console.log(`commitment   ${link.commitment}`);

  // Step 0 — sanity check: is the claimant already registered? If so this probe proves nothing.
  const priorKey = await provider.callContract({
    contractAddress: CHAIN.poolAddress,
    entrypoint: 'get_public_key',
    calldata: [claimant.address],
  });
  if (BigInt(priorKey[0] ?? '0x0') !== 0n) {
    console.error(
      '\nThe claimant account already has a viewing key on this pool. Use a fresh account — ' +
        'this probe only means something against one that has never registered.',
    );
    process.exit(1);
  }
  console.log('confirmed: claimant has no viewing key on this pool yet');

  // Step 1 — sender creates the claim, pre-funding the claimant with the pool fee out of the
  // escrow so a zero-balance recipient can pay it in step 2 (ClaimPrefunded in the contract).
  console.log('\n[1/2] sender: create-claim (withdraw + XeniaEscrow.Deposit)');
  const senderWallet = await walletFor(provider, sender, 'probe-sender-passphrase', paymasterUrl, paymasterApiKey);

  const expiry = Math.floor(Date.now() / 1000) + 60 * 60;
  // No escrow pre-fund on this first attempt — that pulls from the escrow's OWN STRK reserve
  // (unknown state), and AVNU's `sponsored_private` paymaster mode may already cover the
  // claimant's pool fee without it. Add prefund back if the claim step fails on the fee.
  const createActions = createClaimActions({
    escrow: ESCROW_ADDRESS,
    token: POOL_FEE_TOKEN,
    amount: amount.toString(),
    commitment: link.commitment,
    expiry,
    refundTo: sender.address,
  });

  const { transaction_hash: createHash } = await senderWallet.strk20InvokeTransaction(createActions);
  console.log(`  submitted — ${CHAIN.explorer}/tx/${createHash}`);
  await provider.waitForTransaction(createHash);
  console.log('  confirmed');

  // Step 2 — claimant registers and claims in the SAME transaction. This is the thing being
  // proved. CorePrivateTransfersProver always sets autoRegister: true.
  console.log('\n[2/2] claimant: register + claim (transfer OPEN + XeniaEscrow.Claim)');
  const claimantWallet = await walletFor(
    provider,
    claimant,
    'probe-claimant-passphrase',
    paymasterUrl,
    paymasterApiKey,
  );

  const signature = signClaim(link.sk, link.commitment, claimant.address);
  const claimActionsList = claimActions({
    escrow: ESCROW_ADDRESS,
    token: POOL_FEE_TOKEN,
    claimant: claimant.address,
    pk: link.pk,
    signature,
    // The claimant has no private pool balance (correct — never registered), and the pool fee
    // withdrawal needs an inflow to net against. In production this comes from XeniaEscrow's
    // pre-fund; here the claimant already holds public STRK from test funding, so it deposits
    // the fee itself alongside the claim.
    fee: { token: POOL_FEE_TOKEN, amount: POOL_FEE.toString() },
  });

  const { transaction_hash: claimHash } = await claimantWallet.strk20InvokeTransaction(claimActionsList);
  console.log(`  submitted — ${CHAIN.explorer}/tx/${claimHash}`);
  await provider.waitForTransaction(claimHash);
  console.log('  confirmed');

  // Step 3 — verify: does the pool now show a viewing key for an account that had none at start?
  const afterKey = await provider.callContract({
    contractAddress: CHAIN.poolAddress,
    entrypoint: 'get_public_key',
    calldata: [claimant.address],
  });
  const registered = BigInt(afterKey[0] ?? '0x0') !== 0n;

  console.log(
    `\n${registered ? 'PROVEN' : 'NOT PROVEN'}: claimant registered ${
      registered ? 'inside the claim transaction' : 'still has no viewing key — investigate before trusting this route'
    }`,
  );
  console.log(`Transaction: ${CHAIN.explorer}/tx/${claimHash}`);
}

main().catch((error) => {
  console.error(`\nfailed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
