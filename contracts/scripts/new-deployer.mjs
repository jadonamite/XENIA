/**
 * Create and deploy a dedicated deployer account.
 *
 * Why not just use a wallet account: Ready/Argent accounts from v0.4 with Argent Shield enabled
 * carry a guardian, and validation then needs both the owner's and the guardian's signature. The
 * guardian key is held by Argent, so such an account cannot be driven from a script at all. A
 * plain OpenZeppelin account has one owner and accepts a bare [r, s].
 *
 * It is also simply better practice: a deploy key should be purpose-built and disposable, not the
 * key to a wallet you also use for anything else.
 *
 *   node --env-file=.env new-deployer.mjs --generate   # make a keypair, write .env, print address
 *   node --env-file=.env new-deployer.mjs --deploy     # deploy it, once funded
 *
 * The generated private key is written to `.env` and never printed. Only the address is shown,
 * because the address is what you need in order to fund it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Account, RpcProvider, ec, hash, stark } from 'starknet';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Which env file to write into. Mainnet and Sepolia keep separate ones so a deploy cannot
 * pick up the wrong network's account by accident. */
const ENV = resolve(HERE, process.env.ENV_FILE ?? '.env');

/** OpenZeppelin account, already declared on both Sepolia and mainnet. */
const OZ_CLASS_HASH = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';

const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

const die = (m) => {
  console.error(`\n  ✗ ${m}\n`);
  process.exit(1);
};

/** Address is deterministic from the key, so it can be funded before the account exists. */
const addressFor = (publicKey) =>
  hash.calculateContractAddressFromHash(publicKey, OZ_CLASS_HASH, [publicKey], 0);

const setEnv = (key, value) => {
  let text = readFileSync(ENV, 'utf8');
  text = text.match(new RegExp(`^${key}=.*$`, 'm'))
    ? text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`)
    : `${text.replace(/\n*$/, '\n')}${key}=${value}\n`;
  writeFileSync(ENV, text);
};

const generate = () => {
  const privateKey = stark.randomAddress();
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const address = addressFor(publicKey);

  setEnv('DEPLOYER_PRIVATE_KEY', privateKey);
  setEnv('DEPLOYER_ADDRESS', address);
  setEnv('ACCOUNT_TYPE', 'standard');

  console.log('\n  A new deployer account has been written to .env.');
  console.log('  The private key is in that file only — it is deliberately not printed here.\n');
  console.log(`    address     ${address}`);
  console.log(`    class hash  ${OZ_CLASS_HASH}`);
  console.log('\n  Send it a few Sepolia STRK from Ready, then run:');
  console.log('    node --env-file=.env new-deployer.mjs --deploy\n');
};

const deploy = async () => {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY ?? die('DEPLOYER_PRIVATE_KEY is not set.');
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  const address = addressFor(publicKey);
  const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL ?? die('STARKNET_RPC_URL is not set.') });

  console.log(`\n  address   ${address}`);

  try {
    await provider.getClassHashAt(address);
    console.log('  already deployed — nothing to do\n');
    return;
  } catch {
    /* expected: not deployed yet */
  }

  const balance = await provider.callContract({
    contractAddress: STRK,
    entrypoint: 'balanceOf',
    calldata: [address],
  });
  const raw = BigInt(balance[0]) + (BigInt(balance[1] ?? '0x0') << 128n);
  console.log(`  STRK      ${raw / 10n ** 18n}.${(raw % 10n ** 18n).toString().padStart(18, '0').slice(0, 4)}`);
  if (raw === 0n) die('Not funded yet. Send some STRK to the address above first.');

  const account = new Account({ provider, address, signer: privateKey });
  console.log('\n  Deploying account…');
  const { transaction_hash, contract_address } = await account.deployAccount({
    classHash: OZ_CLASS_HASH,
    constructorCalldata: [publicKey],
    addressSalt: publicKey,
  });
  console.log(`  tx        ${transaction_hash}`);
  await provider.waitForTransaction(transaction_hash);
  console.log(`\n  ✓ deployer account live at ${contract_address}\n`);
};

if (process.argv.includes('--generate')) generate();
else if (process.argv.includes('--deploy')) await deploy();
else die('Pass --generate or --deploy.');
