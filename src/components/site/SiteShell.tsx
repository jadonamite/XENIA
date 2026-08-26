'use client';

import { usePathname } from 'next/navigation';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { WalletProvider } from '@/lib/xenia/WalletContext';
import type { ReactNode } from 'react';

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isAppView =
    pathname === '/create' ||
    pathname === '/claims' ||
    pathname?.startsWith('/c');

  return (
    <WalletProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {isAppView ? <AppHeader /> : <Nav />}
        <div style={{ flex: 1 }}>{children}</div>
        {isAppView ? <AppFooter /> : <Footer />}
      </div>
    </WalletProvider>
  );
}
