import type { Metadata } from 'next';
import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://usexenia.vercel.app'),
  title: 'Xenia — private payment links on Starknet',
  description:
    'Send private funds to someone who has never touched Starknet. They open a link, connect a wallet, and the claim registers them as it pays them.',
  openGraph: {
    title: 'Xenia — private payment links on Starknet',
    description:
      'Pay someone privately who has never registered a STRK20 viewing key. They register inside the claim.',
    url: 'https://usexenia.vercel.app',
    siteName: 'Xenia',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f%5B%5D=switzer@400,500,600,700,401,501&display=swap"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cmask id='m'%3E%3Crect width='100' height='100' rx='8' fill='%23fff'/%3E%3Cpath d='M-2 50 Q 50 79 102 50 Q 50 21 -2 50' fill='%23000'/%3E%3Crect x='46' y='-2' width='8' height='104' fill='%23000'/%3E%3C/mask%3E%3Crect width='100' height='100' rx='8' fill='%231391E2' mask='url(%23m)'/%3E%3C/svg%3E"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
