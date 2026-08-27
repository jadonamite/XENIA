import Link from 'next/link';
import { Scatter } from './Scatter';
import { Wordmark } from './Wordmark';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Create a link', href: '/create' },
      { label: 'Claim a link', href: '/c' },
      { label: 'My links', href: '/claims' },
    ],
  },
  {
    title: 'Build',
    links: [
      { label: 'Repository', href: 'https://github.com/jadonamite/XENIA' },
      { label: 'Documentation', href: 'https://github.com/jadonamite/XENIA/tree/main/docs' },
      { label: 'Escrow contract', href: 'https://github.com/jadonamite/XENIA/blob/main/docs/integrate/escrow-contract.md' },
    ],
  },
  {
    title: 'Protocol',
    links: [
      { label: 'STRK20', href: 'https://strk20.starknet.io' },
      { label: 'By example', href: 'https://strk20-by-example.org' },
      { label: 'Starknet', href: 'https://starknet.io' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="page">
        <div className="footer-cols">
          <div>
            <Wordmark id="footer-mark" size={24} />
            <p className="small measure-narrow" style={{ marginTop: 14 }}>
              Private payment links on Starknet. Send to anyone — the claim registers them and pays
              them in the same transaction.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div className="footer-col" key={column.title}>
              <h3>
                <span className="bullet bullet-accent" aria-hidden />
                {column.title}
              </h3>
              {column.links.map((link) =>
                link.href.startsWith('http') ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>

        <div className="footer-mark-wrap" aria-hidden>
          <div className="footer-mark">XENIA</div>
          <Scatter count={16} offset={3} style={{ top: '18%', bottom: '18%' }} />
        </div>

        <div className="footer-base">
          <span>© 2026 Xenia. MIT licensed.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/terms" style={{ color: 'inherit' }}>
              Terms &amp; Conditions
            </Link>
            <span aria-hidden style={{ opacity: 0.4 }}>|</span>
            <Link href="/privacy" style={{ color: 'inherit' }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
