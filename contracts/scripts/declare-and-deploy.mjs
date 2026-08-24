/**
 * Declare and deploy `XeniaEscrow`.
 *
 * Exists because `sncast` has no Windows binary and will not build from source on the contract
 * machine. starknet.js does the same job with the Node that is already installed, and reads the
 * Sierra and CASM that `scarb build` already produces.
 *
 * Usage:
 *
 *   npm install
 *   node declare-and-deploy.mjs --dry-run     # compute the class hash, submit nothing
 *   node declare-and-deploy.mjs               # declare + deploy
 *
 * Environment (a .env is not read — export these, or prefix the command):
 *
 *   STARKNET_RPC_URL       RPC endpoint. Mainnet: https://rpc.starknet.lava.build
 *   DEPLOYER_ADDRESS       Account that pays for the declare and deploy
 *   DEPLOYER_PRIVATE_KEY   Its private key
 *   POOL_ADDRESS           Constructor argument: the STRK20 privacy pool
 *   CONFIRM_MAINNET=yes    Required only when the RPC reports SN_MAIN
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Account, CallData, RpcProvider, constants, hash } from 'starknet';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(HERE, '..', 'target', 'dev');
const SIERRA = resolve(TARGET, 'xenia_XeniaEscrow.contract_class.json');
const CASM = resolve(TARGET, 'xenia_XeniaEscrow.compiled_contract_class.json');

/**
 * The verified mainnet pool (MAINNET-DAY-0). The address published in the STRK20 docs is Sepolia.
 *
 * This matters more here than anywhere else: `privacy_contract` is set in the constructor and has
 * no setter, and `privacy_invoke` asserts the caller matches it on every path. Deploying to
 * mainnet against the Sepolia address produces a contract where every single call reverts
 * CALLER_NOT_PRIVACY, recoverable only by redeploying and redoing every transaction.
 */
const MAINNET_POOL = '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a';

const dryRun = process.argv.includes('--dry-run');

const die = (message) => {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
};

const required = (name) => process.env[name] ?? die(`${name} is not set.`);

const readJson = (path, what) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    die(`Could not read the ${what} at ${path}.\n    Run \`scarb build\` in contracts/ first.\n    (${error.message})`);
  }
};

const normalise = (address) => `0x${BigInt(address).toString(16).padStart(64, '0')}`;

const main = async () => {
  const sierra = readJson(SIERRA, 'Sierra class');
  const casm = readJson(CASM, 'CASM class');

  // Computable without a network, so --dry-run can report it before anything is submitted.
  const classHash = hash.computeContractClassHash(sierra);
  console.log(`\n  class hash   ${classHash}`);

  const poolAddress = required('POOL_ADDRESS');
  console.log(`  pool         ${normalise(poolAddress)}`);

  if (dryRun) {
    console.log('\n  Dry run — nothing submitted.\n');
    return;
  }

  const provider = new RpcProvider({ nodeUrl: required('STARKNET_RPC_URL') });
  const chainId = await provider.getChainId();
  const isMainnet = chainId === constants.StarknetChainId.SN_MAIN;
  console.log(`  chain        ${chainId}${isMainnet ? '  (MAINNET)' : ''}`);

  if (isMainnet) {
    if (normalise(poolAddress) !== normalise(MAINNET_POOL)) {
      die(
        `POOL_ADDRESS does not match the verified mainnet pool.\n` +
          `    given    ${normalise(poolAddress)}\n` +
          `    expected ${normalise(MAINNET_POOL)}\n` +
          `    The constructor has no setter. Deploying this would brick every call.`,
      );
    }
    if (process.env.CONFIRM_MAINNET !== 'yes') {
      die('Refusing to deploy to mainnet without CONFIRM_MAINNET=yes.');
    }
  }

  const account = new Account(
    provider,
    required('DEPLOYER_ADDRESS'),
    required('DEPLOYER_PRIVATE_KEY'),
  );

  console.log('\n  Declaring…');
  // `declareIfNot` is a no-op when the class is already on-chain, which makes a re-run after a
  // failed deploy cheap rather than an error.
  const declared = await account.declareIfNot({ contract: sierra, casm });
  if (declared.transaction_hash) {
    console.log(`  declare tx   ${declared.transaction_hash}`);
    await provider.waitForTransaction(declared.transaction_hash);
  } else {
    console.log('  already declared');
  }

  console.log('\n  Deploying…');
  const deployed = await account.deployContract({
    classHash: declared.class_hash ?? classHash,
    constructorCalldata: CallData.compile([poolAddress]),
  });
  console.log(`  deploy tx    ${deployed.transaction_hash}`);
  await provider.waitForTransaction(deployed.transaction_hash);

  console.log(`\n  ✓ XeniaEscrow deployed\n`);
  console.log(`    address    ${deployed.contract_address}`);
  console.log(`    class hash ${declared.class_hash ?? classHash}\n`);
  console.log('    Next: put the address in strk20.json "contracts" and in');
  console.log('    NEXT_PUBLIC_XENIA_ESCROW for the client.\n');
};

main().catch((error) => die(error.stack ?? String(error)));
