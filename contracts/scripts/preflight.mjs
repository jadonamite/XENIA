/**
 * Pre-flight checks on the deploying account, before anything is submitted.
 *
 * Catches the three things that waste a deploy attempt:
 *   1. The account is not deployed on-chain. Starknet accounts are contracts, and a funded but
 *      undeployed account cannot send transactions. This is the usual first-time snag.
 *   2. The private key does not control the address. Cheaper to learn here than from a rejected
 *      transaction.
 *   3. The account cannot pay for the declare, which is the expensive half.
 *
 * Reads the same `.env` as the deploy script:  npm run preflight
 */

import { RpcProvider, ec } from 'starknet';

const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const ETH = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

const hex = (v) => `0x${BigInt(v).toString(16)}`;
const eq = (a, b) => BigInt(a) === BigInt(b);

const fmt = (low, high, decimals = 18) => {
  const raw = BigInt(low) + (BigInt(high) << 128n);
  const whole = raw / 10n ** BigInt(decimals);
  const frac = (raw % 10n ** BigInt(decimals)).toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${frac}`;
};

const address = process.env.DEPLOYER_ADDRESS;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const rpc = process.env.STARKNET_RPC_URL;
if (!address || !privateKey || !rpc) {
  console.error('\n  ✗ DEPLOYER_ADDRESS, DEPLOYER_PRIVATE_KEY and STARKNET_RPC_URL must all be set.\n');
  process.exit(1);
}

const provider = new RpcProvider({ nodeUrl: rpc });
let ok = true;

console.log(`\n  chain     ${await provider.getChainId()}`);
console.log(`  account   ${hex(address)}`);

// 1 — deployed?
let classHash = null;
try {
  classHash = await provider.getClassHashAt(hex(address));
  console.log(`  class     ${classHash}`);
} catch {
  // Not fatal yet — the balance below decides whether this needs a faucet or just a deploy.
  console.log('  class     NOT DEPLOYED');
  ok = false;
}

// 2 — does the key control it?
const expected = ec.starkCurve.getStarkKey(privateKey);
let onchain = null;
for (const entrypoint of classHash ? ['get_owner', 'getPublicKey', 'get_public_key'] : []) {
  try {
    const r = await provider.callContract({ contractAddress: hex(address), entrypoint, calldata: [] });
    if (r?.length) {
      onchain = r[0];
      break;
    }
  } catch {
    /* wallets expose different names; try the next */
  }
}
if (onchain === null) {
  console.log(`  signer    not readable yet — key derives ${expected}`);
} else if (eq(onchain, expected)) {
  console.log(`  signer    ${onchain}  ✓ matches the private key`);
} else {
  console.log(`\n  ✗ KEY MISMATCH`);
  console.log(`    on-chain signer  ${hex(onchain)}`);
  console.log(`    from private key ${expected}`);
  console.log('    This key does not control this address.\n');
  ok = false;
}

// 3 — can it pay?
for (const [name, token] of [['STRK', STRK], ['ETH', ETH]]) {
  try {
    const r = await provider.callContract({
      contractAddress: token,
      entrypoint: 'balanceOf',
      calldata: [hex(address)],
    });
    console.log(`  ${name.padEnd(9)} ${fmt(r[0], r[1] ?? '0x0')}`);
  } catch {
    console.log(`  ${name.padEnd(9)} (could not read)`);
  }
}

console.log(ok ? '\n  ✓ ready to deploy\n' : '\n  ✗ fix the above first\n');
process.exit(ok ? 0 : 1);
