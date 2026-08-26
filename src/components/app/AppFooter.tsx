import Link from 'next/link';

export function AppFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--hairline)',
        background: 'var(--paper)',
        padding: '24px 0',
        marginTop: 'auto',
      }}
    >
      <div
        className="page"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
          color: 'var(--ink-2)',
        }}
      >
        <span>© 2026 Xenia &bull; Non-custodial privacy links</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
            Terms &amp; Conditions
          </Link>
          <span aria-hidden style={{ opacity: 0.4 }}>|</span>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
            Privacy Policy
          </Link>
          <span aria-hidden style={{ opacity: 0.4 }}>|</span>
          <a
            href="https://github.com/jadonamite/XENIA"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
