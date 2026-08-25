export default function TermsPage() {
  return (
    <main className="app">
      <h1>Terms &amp; Conditions</h1>
      <p className="lede">
        Xenia is a free, open-source interface to the Starknet STRK20 protocol.
      </p>

      <h2>1. Non-Custodial Protocol</h2>
      <p className="small">
        Xenia does not hold, custody, or transmit user funds. All deposits and claims interact directly
        with Starknet smart contracts through client-side cryptography. You remain solely responsible
        for the security of your links and wallets.
      </p>

      <h2>2. Bearer Instruments</h2>
      <p className="small">
        Claim links carry ephemeral private keys in the URL fragment. Any party who possesses the link
        can claim the funds locked in escrow before expiration. Please transmit claim links exclusively
        over channels you trust.
      </p>

      <h2>3. As-Is Software</h2>
      <p className="small">
        The software is provided &ldquo;as is&rdquo;, without warranty of any kind, express or implied, under
        the MIT License.
      </p>
    </main>
  );
}
