/**
 * Move the deployer's remaining STRK to another address.
 *
 * The deployer is a purpose-built account that only ever needed enough to declare and deploy.
 * Whatever is left over belongs back in a wallet you actually use.
 *
 *   node --env-file=.env.mainnet sweep.mjs --to 0x... [--dry-run]
 *
 * "Everything" cannot mean the whole balance: the transfer itself costs gas, and an account that
 * sends its last token cannot pay for the sending. So the estimated fee is subtracted, with a
 * margin, and the remainder is swept.
 */

import { Account, RpcProvider, cairo } from 'starknet';

const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

const die = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

const strk = (raw) => `${(Number(raw) / 1e18).toFixed(4)} STRK`;

const to = arg('--to') ?? die('Pass --to 0x...');
const dryRun = process.argv.includes('--dry-run');

const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL ?? die('STARKNET_RPC_URL') });
const address = process.env.DEPLOYER_ADDRESS ?? die('DEPLOYER_ADDRESS');
const account = new Account({
  provider,
  address,
  signer: process.env.DEPLOYER_PRIVATE_KEY ?? die('DEPLOYER_PRIVATE_KEY'),
});

console.log(`\n  chain       ${await provider.getChainId()}`);
console.log(`  from        ${address}`);
console.log(`  to          ${to}`);

const read = await provider.callContract({
  contractAddress: STRK,
  entrypoint: 'balanceOf',
  calldata: [address],
});
const balance = BigInt(read[0]) + (BigInt(read[1] ?? '0x0') << 128n);
console.log(`  balance     ${strk(balance)}`);
if (balance === 0n) die('Nothing to sweep.');

const call = (amount) => ({
  contractAddress: STRK,
  entrypoint: 'transfer',
  calldata: [to, ...Object.values(cairo.uint256(amount)).map((v) => `0x${BigInt(v).toString(16)}`)],
});

// Estimate against the full balance: the fee barely varies with the amount, and estimating against
// something we cannot afford to send is fine — nothing is submitted.
const { overall_fee } = await account.estimateInvokeFee(call(balance));
// Doubled, because the fee is a ceiling the account must cover, not a charge it will incur.
const reserve = BigInt(overall_fee) * 2n;
const amount = balance - reserve;
console.log(`  est. fee    ${strk(overall_fee)}`);
console.log(`  reserve     ${strk(reserve)}  (fee, doubled)`);
console.log(`  sending     ${strk(amount)}`);

if (amount <= 0n) die('The balance does not cover its own transfer fee.');
if (dryRun) {
  console.log('\n  Dry run — nothing submitted.\n');
  process.exit(0);
}

const { transaction_hash } = await account.execute(call(amount));
console.log(`\n  tx          ${transaction_hash}`);
await provider.waitForTransaction(transaction_hash);

const after = await provider.callContract({
  contractAddress: STRK,
  entrypoint: 'balanceOf',
  calldata: [to],
});
console.log(`\n  ✓ swept. Destination now holds ${strk(BigInt(after[0]) + (BigInt(after[1] ?? '0x0') << 128n))}\n`);
