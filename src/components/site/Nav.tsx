'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PillLink } from './Pill';
import { Wordmark } from './Wordmark';

const LINKS = [
  { label: 'How it works', href: '/#how' },
  { label: 'Why Xenia', href: '/#why' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'GitHub', href: 'https://github.com/jadonamite/XENIA' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={scrolled ? 'nav nav-scrolled' : 'nav'}>
      <div className="page nav-inner">
        <Link href="/" aria-label="Xenia home">
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

        <PillLink href="/create">Open the app</PillLink>
      </div>
    </header>
  );
}
