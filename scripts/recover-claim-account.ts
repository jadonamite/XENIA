/**
 * Recovers the Starknet account a claim link owns, so its private balance can be reached.
 *
 * A private claim pays into an account derived from the link itself — not into any wallet. The
 * recipient therefore controls real funds through an account the app never shows them, because
 * `submitPrivateClaimNoWallet` derives the key in memory and discards it. Until the Claimed screen
 * exports it, this is how someone holding a link gets at what they were paid.
 *
 * Imports the app's own `deriveAccountKey` rather than restating the derivation, so the two cannot
 * drift apart. Run it locally; the link is a bearer secret and must not be pasted anywhere else.
 *
 *   node --experimental-strip-types scripts/recover-claim-account.ts "<the full claim link>"
 */
import { deriveAccountKey } from '../src/lib/xenia/crypto.ts';

const link = process.argv[2];
if (!link) {
  console.error('\n  Pass the claim link:\n    node --experimental-strip-types scripts/recover-claim-account.ts "https://…/c#0x…"\n');
  process.exit(1);
}

// The secret rides in the fragment, so accept either a whole URL or the bare key.
const sk = link.includes('#') ? link.slice(link.indexOf('#') + 1).trim() : link.trim();
if (!/^0x[0-9a-fA-F]+$/.test(sk)) {
  console.error('\n  That does not look like a link key. Expected the part after "#", starting 0x.\n');
  process.exit(1);
}

const { address, privateKey, publicKey } = deriveAccountKey(sk);

console.log('\n  Claim account recovered');
console.log('  ─────────────────────────────────────────────');
console.log('  address     ', address);
console.log('  public key  ', publicKey);
console.log('  PRIVATE KEY ', privateKey);
console.log('\n  Import this into Ready as an existing Argent account, then use the wallet\'s own');
console.log('  STRK20 controls to move the private balance out.');
console.log('\n  Anyone holding this key holds the funds. Do not share it or paste it online.\n');
