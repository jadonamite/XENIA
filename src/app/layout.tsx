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
        <link rel="icon" href="/Xenia.png" type="image/png" />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
