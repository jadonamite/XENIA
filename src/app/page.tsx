import { Accordion } from '@/components/site/Accordion';
import { AppMock } from '@/components/site/AppMock';
import { DelegationSync } from '@/components/site/DelegationSync';
import { HowItWorks } from '@/components/site/HowItWorks';
import { Paint } from '@/components/site/Paint';
import { PillLink } from '@/components/site/Pill';
import { Reveal } from '@/components/site/Reveal';
import { Scatter } from '@/components/site/Scatter';
import { WalletGrid } from '@/components/site/WalletGrid';

const BUILT_ON = ['Starknet', 'STRK20', 'Cairo', 'Next.js', 'Vercel'];

const REASONS = [
  {
    title: 'Nobody registers first',
    body: 'The claim carries the setup. A recipient with no viewing key is paid in one transaction.',
  },
  {
    title: 'Nothing reaches a server',
    body: 'The key rides in the URL fragment. Our host never sees it, so it cannot spend it.',
  },
  {
    title: 'Expiry, not limbo',
    body: 'Unclaimed funds return to you on a timer. No unclaimed link is a permanent write-off.',
  },
];

const DELEGATION = [
  {
    title: 'Register inside the claim',
    body: 'Setting a viewing key is phase 0 and an external invoke is phase 7, so both fit in one STRK20 transaction. The recipient never sees a setup step, because there is not one.',
  },
  {
    title: 'Open notes, not fixed amounts',
    body: 'The claim opens a note whose amount is measured at execution. The escrow names the figure, so the claimant never has to restate an amount the sender chose.',
  },
  {
    title: 'A signature, not a password',
    body: 'The link carries a private key. Claiming signs the claimant’s own address, so a claim lifted out of the mempool authorises an address the thief does not control.',
  },
  {
    title: 'Refund without a rescue script',
    body: 'Every link has an expiry and a refund path keyed to the sender. Getting your money back is a button, not a support ticket.',
  },
];

const LEAKS = [
  {
    label: 'The chain',
    body: 'Sees a hash of the link key and an escrow that holds a balance. Not who created it, and not who it was meant for.',
  },
  {
    label: 'This website',
    body: 'Sees nothing. The key is in the fragment, which browsers do not transmit, and the claim is signed in your browser.',
  },
  {
    label: 'Anyone holding the link',
    body: 'Can claim it. It is a bearer instrument, and we say so on the page rather than in a footnote.',
  },
];

const FAQ = [
  {
    title: 'Does the recipient need a Starknet wallet?',
    body: 'A wallet, yes. A configured private balance, no — that is the part Xenia removes. Their first Xenia transaction registers the viewing key and credits the note together.',
  },
  {
    title: 'What if I lose the link?',
    body: 'It is stored in your browser under "my links" so you can re-copy it. If you clear that, wait for the expiry and refund the escrow — the money is on-chain and keyed to your address, not to anything we store.',
  },
  {
    title: 'Can somebody steal a claim from the mempool?',
    body: 'They can read the transaction, but the signature inside it authorises one specific address. Replaying it pays the person it was already going to pay.',
  },
  {
    title: 'Is the escrow contract audited?',
    body: 'No. It is MIT-licensed and in the repository, the tests are in the repository, and the invariants are written down in the requirements document. Read it before you send an amount that matters.',
  },
  {
    title: 'What does it cost?',
    body: 'Network fees, and nothing else. Xenia takes no cut and has no token.',
  },
];

export default function Home() {
  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="page" style={{ paddingTop: 12 }}>
        <div
          className="panel-paint panel-scrim"
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 'min(620px, 76vh)',
            padding: '80px 24px',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <Paint variant="dawn" id="hero" />
          <div>
            <h1 className="display" style={{ maxWidth: '15ch', marginInline: 'auto' }}>
              Send private money to someone <em>who isn&rsquo;t</em> set up to receive it
            </h1>
            <p
              className="lede measure"
              style={{ margin: '22px auto 30px', color: 'rgba(255,255,255,0.88)' }}
            >
              STRK20 can only pay an address that has already published a viewing key. Xenia locks
              funds against a link — and the recipient&rsquo;s very first transaction registers them
              and pays them at the same time.
            </p>
            <PillLink href="/create">Create a claim link</PillLink>
          </div>
        </div>
      </section>

      {/* ---------- built on ---------- */}
      <section className="page section-tight centered">
        <p className="small" style={{ marginTop: 0 }}>
          Built on
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 40, marginTop: 18 }}>
          {BUILT_ON.map((name) => (
            <span
              key={name}
              style={{ fontSize: 20, fontWeight: 500, color: 'var(--ink-3)', letterSpacing: '-0.01em' }}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- why ---------- */}
      <section className="page section" id="why">
        <Reveal>
          <div className="split">
            <div>
              <span className="eyebrow">Why Xenia</span>
              <h2 className="head" style={{ maxWidth: '14ch' }}>
                A link, not an address
              </h2>
            </div>
            <p className="lede">
              Every private payment system on Starknet can already pay people who set themselves up
              first. That is the easy half. Xenia is built for the other half — the person who has
              never opened a private balance and does not know they need one.
            </p>
          </div>
        </Reveal>

        <div className="cards">
          {REASONS.map((reason, i) => (
            <Reveal key={reason.title} delay={i * 70}>
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <span className="card-numeral">0{i + 1}.</span>
                <Scatter count={9} offset={i * 4} style={{ top: '30%', bottom: '42%' }} />
                <div style={{ position: 'relative' }}>
                  <h3 className="card-title">{reason.title}</h3>
                  <p className="small" style={{ marginBottom: 0 }}>
                    {reason.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}

          <Reveal delay={210}>
            <div className="card card-raised">
              <div style={{ marginBottom: 18 }}>
                <AppMock variant="claim" />
              </div>
              <div>
                <h3 className="card-title">One screen, one signature</h3>
                <p className="small" style={{ marginBottom: 0 }}>
                  What the recipient sees is an amount and a button. Everything the protocol needs
                  happens behind that button, in a single transaction.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- delegation ---------- */}
      <section className="page section">
        <Reveal>
          <div className="split">
            <div>
              <span className="eyebrow">One transaction</span>
              <h2 className="head">
                Send it once.
                <br />
                <em>They do the rest.</em>
              </h2>
            </div>
            <p className="lede">
              The hard part of private payments is not the cryptography, it is the onboarding step
              that has to happen before the cryptography is any use. Xenia folds that step into the
              payment.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <DelegationSync />
        </Reveal>
      </section>

      {/* ---------- what leaks ---------- */}
      <section className="page section">
        <Reveal>
          <div className="centered">
            <span className="eyebrow">Privacy, stated precisely</span>
            <h2 className="head" style={{ maxWidth: '18ch', marginInline: 'auto' }}>
              What each party can see
            </h2>
            <p className="lede measure" style={{ marginTop: 18 }}>
              A privacy tool that will not tell you its edges is not a privacy tool. These are ours.
            </p>
          </div>
        </Reveal>

        <div
          className="cards"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {LEAKS.map((leak, i) => (
            <Reveal key={leak.label} delay={i * 70}>
              <div
                className="card"
                style={{ justifyContent: 'flex-start', gap: 14, minHeight: 200 }}
              >
                <h3 className="card-title" style={{ color: 'var(--accent)', fontSize: 16 }}>
                  {leak.label}
                </h3>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.45 }}>{leak.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section className="page section" id="how">
        <Reveal>
          <div className="centered" style={{ marginBottom: 44 }}>
            <span className="eyebrow">How it works</span>
            <h2 className="head" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
              From link to claim. <em>Nothing in between.</em>
            </h2>
          </div>
        </Reveal>
        <Reveal>
          <HowItWorks />
        </Reveal>
      </section>

      {/* ---------- faq ---------- */}
      <section className="page section" id="faq">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
            gap: 56,
          }}
          className="faq-grid"
        >
          <Reveal>
            <div style={{ position: 'relative', minHeight: 380 }}>
              <span className="eyebrow">FAQ</span>
              <h2 className="head">Questions answered.</h2>
              <p className="lede" style={{ margin: '18px 0 20px' }}>
                Still curious?
              </p>
              <PillLink href="https://github.com/jadonamite/XENIA/issues" variant="ghost">
                Open an issue
              </PillLink>
              <Scatter count={13} offset={6} style={{ top: '38%' }} />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <Accordion items={FAQ} look="filled" initial={-1} />
          </Reveal>
        </div>
      </section>

      {/* ---------- wallet support ecosystem ---------- */}
      <WalletGrid />

      {/* ---------- closing ---------- */}
      <section className="page" style={{ paddingBottom: 'var(--section)' }}>
        <Reveal>
          <div
            className="panel-paint panel-scrim"
            style={{
              display: 'grid',
              placeItems: 'center',
              minHeight: 420,
              padding: '72px 24px',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <Paint variant="dusk" id="cta" />
            <div>
              <h2 className="head" style={{ maxWidth: '17ch', marginInline: 'auto' }}>
                Pay anyone privately. <em style={{ color: 'rgba(255,255,255,0.72)' }}>Even today.</em>
              </h2>
              <p
                className="lede measure"
                style={{ margin: '20px auto 28px', color: 'rgba(255,255,255,0.88)' }}
              >
                Open source, no fee, no token. Lock an amount against a link and send it the way you
                would send anything else.
              </p>
              <PillLink href="/create">Create a claim link</PillLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
