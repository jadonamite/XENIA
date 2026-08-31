import { NextResponse } from 'next/server';

/**
 * Forwards AVNU paymaster JSON-RPC calls, attaching the API key server-side.
 *
 * `AvnuPaymaster` (from `@starkware-libs/starknet-privacy-client`) sends a plain
 * `{jsonrpc, id, method, params}` POST and reads the header key only if one is configured — so
 * pointing it at this route with no key set, and setting the real key only here, keeps the key out
 * of the browser bundle. AVNU's own guidance is explicit about this: never expose the key client-side.
 *
 * This never sees the claim link's secret. Proving happens in the browser against the public
 * prover URL; only the already-proven `{call, proof}` — not secret, it is what lands on chain
 * either way — passes through here.
 */

/**
 * AVNU's key is project-scoped, not network-scoped — the same key works against both endpoints
 * (verified live against `starknet.paymaster.avnu.fi` and `sepolia.paymaster.avnu.fi`). Only the
 * URL needs to track which network the build is pointed at.
 */
const PAYMASTER_URL =
  process.env.NEXT_PUBLIC_XENIA_NETWORK === 'sepolia'
    ? 'https://sepolia.paymaster.avnu.fi'
    : 'https://starknet.paymaster.avnu.fi';
const PAYMASTER_API_KEY = process.env.AVNU_PAYMASTER_API_KEY;

export async function POST(request: Request) {
  if (!PAYMASTER_URL || !PAYMASTER_API_KEY) {
    return NextResponse.json({ error: 'Paymaster is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const upstream = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-paymaster-api-key': PAYMASTER_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
