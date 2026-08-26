export default function PrivacyPage() {
  return (
    <main className="app">
      <h1>Privacy Policy</h1>
      <p className="lede">
        Xenia is engineered to minimize data collection to zero.
      </p>

      <h2>1. Zero Server-Side State</h2>
      <p className="small">
        Xenia does not operate a backend database, tracking scripts, or analytics servers. Ephemeral
        keys travel strictly inside the URL hash fragment (<span className="mono">#</span>), which web
        browsers never send to web servers.
      </p>

      <h2>2. Local Storage Cache</h2>
      <p className="small">
        Created link commitments are cached locally in your browser&rsquo;s <span className="mono">localStorage</span>{' '}
        to allow you to easily re-copy or monitor refund statuses. This data remains entirely on your
        device and can be cleared at any time.
      </p>

      <h2>3. On-Chain Footprint</h2>
      <p className="small">
        Starknet transactions record smart contract interactions according to STRK20 protocol standards.
        Xenia does not link on-chain addresses to any real-world identity.
      </p>
    </main>
  );
}
