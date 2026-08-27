'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/site/Wordmark';
import { PillButton } from '@/components/site/Pill';
import { useWalletContext } from '@/lib/xenia/WalletContext';
import { useState } from 'react';

export function AppHeader() {
  const pathname = usePathname();
  const wallet = useWalletContext();
  const [walletDropdown, setWalletDropdown] = useState(false);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(244, 245, 246, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div
        className="page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBlock: 14,
        }}
      >
        {/* Left: Brand logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/" aria-label="Xenia home" style={{ textDecoration: 'none' }}>
            <Wordmark id="app-nav-mark" size={24} />
          </Link>

          {/* In-App Nav Tabs */}
          <nav
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--card)',
              padding: 3,
              borderRadius: 9999,
              border: '1px solid var(--hairline)',
            }}
          >
            <Link
              href="/shield"
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                background: pathname === '/shield' ? 'var(--card-raised)' : 'transparent',
                color: pathname === '/shield' ? 'var(--ink)' : 'var(--ink-2)',
                boxShadow: pathname === '/shield' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              Send
            </Link>
            <Link
              href="/create"
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                background: pathname === '/create' ? 'var(--card-raised)' : 'transparent',
                color: pathname === '/create' ? 'var(--ink)' : 'var(--ink-2)',
                boxShadow: pathname === '/create' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              Send
            </Link>
            <Link
              href="/claims"
              style={{
                padding: '6px 16px',
                borderRadius: 9999,
                fontSize: 13.5,
                fontWeight: 500,
                textDecoration: 'none',
                background: pathname === '/claims' ? 'var(--card-raised)' : 'transparent',
                color: pathname === '/claims' ? 'var(--ink)' : 'var(--ink-2)',
                boxShadow: pathname === '/claims' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              My Links
            </Link>
          </nav>
        </div>

        {/* Right: Network & Wallet Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Network indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--ink-2)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10794a',
              }}
            />
            <span className="hidden sm:inline">Starknet</span> Mainnet
          </div>

          {/* Wallet Trigger */}
          <div style={{ position: 'relative' }}>
            {wallet.address ? (
              <button
                type="button"
                className="pill pill-plain"
                onClick={() => setWalletDropdown(!walletDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 9999,
                  background: 'var(--card-raised)',
                  border: '1px solid var(--hairline)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <span className="mono">{formatAddress(wallet.address)}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>▼</span>
              </button>
            ) : (
              <PillButton
                disabled={wallet.connecting}
                onClick={() => setWalletDropdown(!walletDropdown)}
              >
                {wallet.connecting ? 'Connecting…' : 'Connect Wallet'}
              </PillButton>
            )}

            {/* Dropdown Menu */}
            {walletDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 8px)',
                  width: 220,
                  padding: 8,
                  borderRadius: 14,
                  background: 'var(--card-raised)',
                  border: '1px solid var(--hairline)',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
                  zIndex: 50,
                }}
              >
                {wallet.address ? (
                  <>
                    <div style={{ padding: '8px 10px' }}>
                      <div className="small" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        CONNECTED AS
                      </div>
                      <div className="mono" style={{ fontSize: 12, marginTop: 2, wordBreak: 'break-all' }}>
                        {wallet.address}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        wallet.disconnect();
                        setWalletDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: 0,
                        background: 'transparent',
                        color: '#c2382f',
                        fontSize: 13,
                        fontWeight: 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ padding: '6px 10px 8px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>
                      Select a Starknet Wallet
                    </div>
                    {wallet.available.length === 0 ? (
                      <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-3)' }}>
                        No wallets detected in browser.
                      </div>
                    ) : (
                      wallet.available.map((w) => (
                        <button
                          key={w.name}
                          onClick={() => {
                            wallet.connect(w);
                            setWalletDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: 0,
                            background: 'transparent',
                            color: 'var(--ink)',
                            fontSize: 13,
                            fontWeight: 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{w.name}</span>
                          <span style={{ color: 'var(--accent)' }}>›</span>
                        </button>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
