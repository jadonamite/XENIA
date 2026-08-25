# Client fixes needed against `XeniaEscrow`

Jadon — four changes, all in `src/lib/xenia/`. Until these land, every claim reverts. Sorry: two
of them are the PRD's fault, not yours, and I've noted which.

The contract is deployed nowhere yet, so nothing here is urgent in the "production is broken"
sense — but it is worth doing before more UI is built on top.

Cross-check against [`INTERFACE.md`](INTERFACE.md), which is the frozen shape.

---

## 1. Calldata must be 10 elements on every operation

**This one is the PRD's fault.** §4.1 freezes a 10-parameter signature, but §5.1/§5.2 show
6-element calldata. You built to §5, which was the reasonable thing to do. §5 is wrong and I am
correcting it.

I verified this against the pool's own source (`packages/privacy/src/actions.cairo`):

```cairo
pub struct InvokeExternalInput {
    pub contract_address: ContractAddress,
    pub calldata: Span<felt252>,
}
```

The pool forwards that span to our entrypoint **unchanged**, and Starknet deserialises it
positionally into the function's parameters. Send 6 felts to a 10-parameter entrypoint and it fails
before our code runs. Unused positions are `0`.

`actions.ts` — `createClaimActions`:

```js
calldata: [
  OPERATION.Deposit,
  p.commitment,
  p.token,
  p.amount,
  `0x${p.expiry.toString(16)}`,
  p.refundTo,
  '0x0',                 // claimant  — unused on Deposit
  '0x0',                 // sig_r
  '0x0',                 // sig_s
  '0x0',                 // note_id
],
```

`claimActions`:

```js
calldata: [
  OPERATION.Claim,
  p.pk,                  // the PUBLIC KEY, not the commitment — see §3 below
  '0x0',                 // token     — unused on Claim, the stored entry wins
  '0x0',                 // amount
  '0x0',                 // expiry
  '0x0',                 // refund_to
  p.claimant,
  p.signature.r,
  p.signature.s,
  FIRST_OPEN_NOTE,
],
```

`refundActions`:

```js
calldata: [
  OPERATION.Refund,
  p.pk,
  '0x0', '0x0', '0x0', '0x0',
  p.refundTo,            // the address the refund signature authorises
  p.signature.r,
  p.signature.s,
  FIRST_OPEN_NOTE,
],
```

`FIRST_OPEN_NOTE` and `'OPEN'` stay literal strings — the wallet substitutes them. Never
`num.toHex` those.

## 2. Refund needs a signature

**Also the PRD's fault.** §4.4.6 says refund is authorised by "a caller matching `refund_to`".
That cannot be implemented: `privacy_invoke` is always called *by the pool*, so
`get_caller_address()` is the pool on every path — and support confirmed private transactions are
submitted by rotating relayers besides, so even the transaction sender is not the user. There is no
way for the contract to learn who initiated a refund.

Refund is therefore authorised the same way a claim is — by proving possession of the link key —
under its own domain tag so the two can never be replayed for each other.

`crypto.ts`:

```ts
export const REFUND_TAG = shortString.encodeShortString('XENIA_REFUND_V1');

/** The message a refunder signs. Same shape as claimMessage, different tag. */
export function refundMessage(commitment: string, refunder: string): string {
  return hexOf(
    hash.computePoseidonHashOnElements([REFUND_TAG, hexOf(commitment), hexOf(refunder)]),
  );
}

export function signRefund(sk: string, commitment: string, refunder: string): ClaimSignature {
  const signature = ec.starkCurve.sign(refundMessage(commitment, refunder), hexOf(sk));
  return { r: hexOf(signature.r), s: hexOf(signature.s) };
}
```

`RefundParams` needs a `signature: ClaimSignature`. The sender generated `sk`, so the sender can
always sign — but note the consequence: `refund_to` is **display metadata, not an access check**.
After expiry, anyone holding the link can sweep it. They could have claimed it before expiry
anyway, so it grants no new capability, and it is consistent with the README's bearer-instrument
row. Worth a line in the refund UI.

## 3. `commitment` vs `pk` — the easy one to get wrong

Your `claimActions` already does this correctly; flagging it so it survives a refactor.

- **Deposit** passes the *hash*: `poseidon(COMMITMENT_TAG, pk)`.
- **Claim and Refund** pass the raw **public key**. The contract hashes it itself and looks that up,
  so a passed-in commitment is never trusted as authorisation.

Passing the hash on a claim finds nothing and reverts `COMMITMENT_NOT_FOUND`.

## 4. Read entrypoint is `get_claim`, not `claim_of`

`escrow.ts` line 40:

```ts
entrypoint: 'get_claim',
```

Returns `ClaimEntry` in declaration order — `token, amount, expiry, refund_to, claimed` — which
matches your positional read. Zero `token` means not found.

---

## Not a fix — the tags now match

`XENIA_COMMITMENT_V1` and `XENIA_CLAIM_V1` were mine to move, and I moved the contract to your
strings rather than the other way round. They agree now. You only need to add `XENIA_REFUND_V1`.

## Confirmed since the PRD was written

- **Our create-claim shape is valid.** `withdraw → invoke` with the helper returning an empty span
  is legal; no `OPEN` transfer is needed on that leg. It must be a properly ABI-encoded empty span,
  which is what the contract returns.
- **The mainnet pool fee is 6 STRK per pool transaction.** Claims well below that will look absurd.
  Worth a minimum-amount guard on `/create`.
- **All three listed mainnet transactions must be tied to `XeniaEscrow`** — a plain shield does not
  count. So the three will be create-claim, claim, refund, which makes the refund path
  demo-critical rather than a safety net.
