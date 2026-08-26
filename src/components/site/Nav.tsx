'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PillLink } from './Pill';
import { Wordmark } from './Wordmark';

const LINKS = [
  { label: 'How it works', href: '/#how' },
  { label: 'Why Xenia', href: '/#why' },
  { label: 'Ecosystem', href: '/#ecosystem' },
  { label: 'FAQ', href: '/#faq' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={scrolled ? 'nav nav-scrolled' : 'nav'}>
        <div className="page nav-inner">
          <Link href="/" aria-label="Xenia home" onClick={closeMenu}>
            <Wordmark id="nav-mark" />
          </Link>

          <nav className="nav-links">
            {LINKS.map((link, i) => (
              <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                {i > 0 && <span className="bullet" aria-hidden />}
                <Link href={link.href}>{link.label}</Link>
              </span>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Premium GitHub Icon Button */}
            <a
              href="https://github.com/jadonamite/XENIA"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub Repository"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--card)',
                border: '1px solid var(--hairline)',
                color: 'var(--ink)',
                textDecoration: 'none',
                transition: 'all 180ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-raised)';
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card)';
                e.currentTarget.style.borderColor = 'var(--hairline)';
                e.currentTarget.style.color = 'var(--ink)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>

            <PillLink href="/create">Open the app</PillLink>

            <button
              className="nav-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h16M4 16h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-head">
          <Link href="/" aria-label="Xenia home" onClick={closeMenu}>
            <Wordmark id="nav-mobile-mark" />
          </Link>
          <button className="nav-toggle" onClick={closeMenu} aria-label="Close menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mobile-links">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="mobile-link"
              onClick={closeMenu}
            >
              <span className="bullet bullet-accent" aria-hidden />
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/jadonamite/XENIA"
            target="_blank"
            rel="noreferrer"
            className="mobile-link"
            onClick={closeMenu}
          >
            <span className="bullet bullet-accent" aria-hidden />
            GitHub
          </a>
        </nav>

        <div className="mobile-cta">
          <div onClick={closeMenu}>
            <PillLink href="/create">
              Create a claim link
            </PillLink>
          </div>
          <p className="small" style={{ margin: 0, textAlign: 'center' }}>
            Private payment links on Starknet &bull; Zero setup required
          </p>
        </div>
      </div>
    </>
  );
}
