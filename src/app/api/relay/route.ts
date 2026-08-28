import { Account, RpcProvider } from 'starknet';
import { NextResponse } from 'next/server';

/**
 * Submits a public claim on the recipient's behalf, so they can be paid having brought nothing.
 *
 * This exists because of a property of the design that is easy to miss: a public claim is
 * authorised by the **link's** key, signed in the recipient's browser — not by their wallet. And
 * `claim_public` is permissionless, because the signature names the destination and the contract
 * pays only that address. So whoever submits the transaction cannot redirect a single token, which
 * means anyone can submit it, which means we can.
 *
 * The recipient therefore needs no gas, no signature, and no wallet at all — just an address.
 *
 * What this endpoint can be made to do at worst is waste our gas on transactions that revert. It
 * cannot be made to pay the wrong person. Keep the relayer's balance small and top it up; a
 * compromise costs whatever is in it and nothing else.
 */

const RELAYER_ADDRESS = process.env.XENIA_RELAYER_ADDRESS;
const RELAYER_PRIVATE_KEY = process.env.XENIA_RELAYER_PRIVATE_KEY;
const ESCROW = process.env.NEXT_PUBLIC_XENIA_ESCROW;
const RPC_URL = process.env.XENIA_RPC_URL ?? 'https://api.zan.top/public/starknet-mainnet';

/** Rejects anything that is not a plausible felt before it reaches the chain. */
const FELT = /^0x[0-9a-fA-F]{1,64}$/;

const canonical = (value: unknown): string | null => {
  if (typeof value !== 'string' || !FELT.test(value)) return null;
  try {
    return `0x${BigInt(value).toString(16)}`;
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  if (!RELAYER_ADDRESS || !RELAYER_PRIVATE_KEY || !ESCROW) {
    return NextResponse.json({ error: 'Relaying is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const { pk, claimant, r, s } = (body ?? {}) as Record<string, unknown>;
  const calldata = [canonical(pk), canonical(claimant), canonical(r), canonical(s)];
  if (calldata.some((value) => value === null)) {
    return NextResponse.json({ error: 'pk, claimant, r and s must be felts.' }, { status: 400 });
  }

  try {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({
      provider,
      address: RELAYER_ADDRESS,
      signer: RELAYER_PRIVATE_KEY,
    });

    const { transaction_hash } = await account.execute({
      contractAddress: ESCROW,
      entrypoint: 'claim_public',
      calldata: calldata as string[],
    });

    return NextResponse.json({ transaction_hash });
  } catch (cause) {
    // The contract's own errors are the useful ones — ALREADY_CLAIMED, BAD_SIGNATURE,
    // CLAIM_EXPIRED. Pass the message through rather than flattening it to "failed".
    const message = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
