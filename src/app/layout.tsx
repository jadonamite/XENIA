import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xenia — private claim links on Starknet',
  description:
    'Send private funds to someone who has never touched Starknet. They open a link, connect a wallet, and the claim registers them as it pays them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bar">
          <Link className="brand" href="/">
            XENIA
          </Link>
          <nav className="row">
            <Link href="/create">Create</Link>
            <Link href="/claims">My links</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
