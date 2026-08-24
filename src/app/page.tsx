import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Pay someone who isn&apos;t on Starknet yet.</h1>
      <p className="lede">
        STRK20 can only pay an address that has already published a viewing key. Xenia closes that
        gap: you lock funds against a link, and the recipient&apos;s first transaction registers
        them and pays them at once.
      </p>

      <div className="panel">
        <div className="row">
          <Link href="/create">
            <button>Create a claim link</button>
          </Link>
          <Link href="/claims">
            <button className="ghost">See my links</button>
          </Link>
        </div>
      </div>

      <h2>How it works</h2>
      <ol>
        <li>You pick a token and an amount. Xenia moves it from your private balance into escrow.</li>
        <li>You get a link. The key lives in the fragment, so it never reaches a server.</li>
        <li>
          Whoever opens it connects a wallet and claims. Registration rides in the same transaction
          as the payment.
        </li>
        <li>Nobody claims before the expiry? You take it back.</li>
      </ol>

      <h2>What the link is</h2>
      <p className="note">
        A bearer instrument. Whoever holds it can claim it, so send it the way you would send cash.
        What it is not is replayable — a claim is signed for one specific address, so lifting it out
        of the mempool buys a thief an authorisation they cannot use.
      </p>
    </main>
  );
}
