/**
 * Probe: does a never-registered account actually register-and-claim in one proven transaction,
 * against `XeniaEscrow`, through the SDK route?
 *
 * This is the entire thesis of the product (PRD §1, README's headline). It was blocked on "no
 * public mainnet prover" until `~/Projects/Inertia/projects/velum` found one
 * (`docs/SPIKE.md`, verified against a real mainnet transaction). This script is the same proof,
 * run against `XeniaEscrow` specifically, on Sepolia first because it is free to repeat.
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/probe-register-claim.ts
 *
 * Needs two Sepolia accounts in `.env.local` (see .env.example):
 *   - XENIA_PROBE_SENDER_*    — already has a shielded pool balance. If it does not,
 *                               run velum/scripts/shield.ts against it first; same Sepolia pool.
 *   - XENIA_PROBE_CLAIMANT_*  — has never registered a viewing key. A fresh Ready/Braavos
 *                               account works; it only needs enough Sepolia STRK for gas, since
 *                               the pool fee is pre-funded out of the escrow in step 1 below,
 *                               exactly as a real claimant would receive it.
 *
 * Keys never leave this machine and this script never writes them anywhere. `.env.local` is
 * gitignored.
 */

import { Account, RpcProvider, constants } from 'starknet';
import type { InvokeCalldataBuilderArgs } from '@starkware-libs/starknet-privacy-sdk';

import { CHAIN, ESCROW_ADDRESS, NETWORK, POOL_FEE, POOL_FEE_TOKEN } from '../src/lib/xenia/config.ts';
import { generateLinkKey, signClaim } from '../src/lib/xenia/crypto.ts';
import { privateClaimClient } from '../src/lib/xenia/sdk.ts';

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

const OPERATION = { Deposit: '0x0', Claim: '0x1', Refund: '0x2' } as const;
const felt = (value: string | number | bigint): string => `0x${BigInt(value).toString(16)}`;

async function main() {
  if (NETWORK !== 'sepolia') {
    console.error(
      'Run this on Sepolia first (NEXT_PUBLIC_XENIA_NETWORK=sepolia). Mainnet costs real STRK per attempt.',
    );
    process.exit(2);
  }
  if (!ESCROW_ADDRESS) throw new Error('NEXT_PUBLIC_XENIA_ESCROW is not set');

  const provider = new RpcProvider({ nodeUrl: CHAIN.rpcUrl });

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

  const amount = toWei('10'); // claim amount, arbitrary and above the pool fee so it reads well
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
  // escrow so a zero-balance recipient can pay it in step 2 (see ClaimPrefunded in the contract).
  console.log('\n[1/2] sender: create-claim (withdraw + XeniaEscrow.Deposit)');
  const senderClient = privateClaimClient({
    account: sender,
    viewingKey: { getViewingKey: async () => sender.address }, // sender must already be registered
  });

  const expiry = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  const depositCalldata = (args: InvokeCalldataBuilderArgs) => ({
    contractAddress: ESCROW_ADDRESS,
    calldata: [
      OPERATION.Deposit,
      felt(link.commitment),
      felt(POOL_FEE_TOKEN), // deposit token — STRK on both networks
      felt(amount),
      felt(BigInt(expiry)),
      felt(sender.address), // refund_to
      felt(claimant.address), // pre-fund recipient — reused Claim/Deposit position
      '0x0',
      '0x0',
      felt(POOL_FEE), // pre-fund amount — covers exactly the claimant's pool fee
    ],
  });

  const createResult = await senderClient
    .build()
    .with(POOL_FEE_TOKEN, (t) =>
      t.withdraw({ recipient: ESCROW_ADDRESS, amount: amount + POOL_FEE }),
    )
    .invoke(depositCalldata)
    .execute();

  const createHash = (createResult.callAndProof.call as unknown as { transaction_hash?: string })
    .transaction_hash;
  console.log(`  submitted — check ${CHAIN.explorer}/tx/${createHash ?? '(see result below)'}`);
  console.log('  waiting for confirmation...');
  if (createHash) await provider.waitForTransaction(createHash);
  console.log('  confirmed');

  // Step 2 — claimant registers and claims in the SAME transaction. This is the thing being
  // proved. `autoRegister: true` is what adds the SetViewingKey action at phase 0.
  console.log('\n[2/2] claimant: register + claim (transfer OPEN + XeniaEscrow.Claim)');

  // The viewing key would normally be derived from a wallet signature (see README's roadmap
  // section); for this probe, deriving it from the account's own key is enough to prove the
  // mechanism. Swap for `deriveViewingKey` from the -client package when wiring the claim page.
  const claimantViewingKey = BigInt(claimant.address) % (2n ** 251n);

  const claimantClient = privateClaimClient({
    account: claimant,
    viewingKey: { getViewingKey: async () => claimantViewingKey },
  });

  const signature = signClaim(link.sk, link.commitment, claimant.address);

  const claimCalldata = (args: InvokeCalldataBuilderArgs) => {
    const openNote = args.openNotes[0];
    if (!openNote) throw new Error('SDK did not create the open note this claim expects');
    return {
      contractAddress: ESCROW_ADDRESS,
      calldata: [
        OPERATION.Claim,
        felt(link.pk),
        '0x0',
        '0x0',
        '0x0',
        '0x0',
        felt(claimant.address),
        felt(signature.r),
        felt(signature.s),
        felt(openNote.noteId),
      ],
    };
  };

  const claimResult = await claimantClient
    .build({ autoRegister: true, autoSetup: true, autoDiscover: { notes: 'refresh', channels: 'refresh' } })
    .with(POOL_FEE_TOKEN, (t) => t.transfer({ recipient: claimant.address, amount: 'OPEN' as unknown as bigint }))
    .invoke(claimCalldata)
    .execute();

  const claimHash = (claimResult.callAndProof.call as unknown as { transaction_hash?: string })
    .transaction_hash;
  console.log(`  submitted — check ${CHAIN.explorer}/tx/${claimHash ?? '(see result below)'}`);
  if (claimHash) {
    console.log('  waiting for confirmation...');
    await provider.waitForTransaction(claimHash);
    console.log('  confirmed');
  }

  // Step 3 — verify: does the pool now show a viewing key for an account that had none at start?
  const afterKey = await provider.callContract({
    contractAddress: CHAIN.poolAddress,
    entrypoint: 'get_public_key',
    calldata: [claimant.address],
  });
  const registered = BigInt(afterKey[0] ?? '0x0') !== 0n;

  console.log(`\n${registered ? 'PROVEN' : 'NOT PROVEN'}: claimant registered ${registered ? 'inside the claim transaction' : 'still has no viewing key — investigate before trusting this route'}`);
  if (claimHash) console.log(`Transaction: ${CHAIN.explorer}/tx/${claimHash}`);
}

main().catch((error) => {
  console.error(`\nfailed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exit(1);
});
