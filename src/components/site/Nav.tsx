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
  { label: 'My links', href: '/claims' },
  { label: 'GitHub', href: 'https://github.com/jadonamite/XENIA' },
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
                {link.href.startsWith('http') ? (
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </span>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            link.href.startsWith('http') ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="mobile-link"
                onClick={closeMenu}
              >
                <span className="bullet bullet-accent" aria-hidden />
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="mobile-link"
                onClick={closeMenu}
              >
                <span className="bullet bullet-accent" aria-hidden />
                {link.label}
              </Link>
            )
          ))}
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
