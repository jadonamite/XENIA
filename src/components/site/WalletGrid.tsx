'use client';

import { Reveal } from './Reveal';

interface WalletCard {
  name: string;
  category: string;
  description: string;
  badge: string;
  badgeType: 'ok' | 'accent' | 'neutral';
}

const WALLETS: WalletCard[] = [
  {
    name: 'Argent X',
    category: 'Starknet Native',
    description: 'Full STRK20 support. Publishes viewing keys directly inside the claim invoke with zero extra prompts.',
    badge: 'Auto-Register Ready',
    badgeType: 'ok',
  },
  {
    name: 'Braavos',
    category: 'Hardware Signer',
    description: 'Supports multi-phase atomic transactions for channel opening and escrow execution in one signature.',
    badge: 'Multicall Verified',
    badgeType: 'accent',
  },
  {
    name: 'Cartridge Controller',
    category: 'Passkeys & WebAuthn',
    description: 'Onboard and claim private funds using device biometrics with no seed phrase setup barrier.',
    badge: 'Passkey Native',
    badgeType: 'accent',
  },
  {
    name: 'Wallet Standard',
    category: 'Ecosystem Standard',
    description: 'Works with any @wallet-standard compliant client across browser extensions and mobile apps.',
    badge: 'Ecosystem Standard',
    badgeType: 'neutral',
  },
];

export function WalletGrid() {
  return (
    <section className="page section" id="ecosystem">
      <Reveal>
        <div className="centered">
          <span className="eyebrow">Ecosystem &amp; Compatibility</span>
          <h2 className="head" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
            Works with any Starknet wallet.
          </h2>
          <p className="lede measure" style={{ marginTop: 18 }}>
            Whether your recipient already uses private balances or installed their first wallet five minutes ago.
          </p>
        </div>
      </Reveal>

      <div className="cards" style={{ marginTop: 44 }}>
        {WALLETS.map((w, i) => (
          <Reveal key={w.name} delay={i * 60}>
            <div
              className="card"
              style={{
                justifyContent: 'space-between',
                padding: '24px',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span className="small" style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)' }}>
                    {w.category}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background:
                        w.badgeType === 'ok'
                          ? 'rgba(16, 121, 74, 0.12)'
                          : w.badgeType === 'accent'
                          ? 'rgba(19, 145, 226, 0.12)'
                          : 'rgba(23, 23, 26, 0.08)',
                      color:
                        w.badgeType === 'ok'
                          ? '#10794a'
                          : w.badgeType === 'accent'
                          ? 'var(--accent)'
                          : 'var(--ink-2)',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background:
                          w.badgeType === 'ok'
                            ? '#10794a'
                            : w.badgeType === 'accent'
                            ? 'var(--accent)'
                            : 'var(--ink-3)',
                      }}
                    />
                    {w.badge}
                  </span>
                </div>

                <h3 className="card-title" style={{ fontSize: 20, marginBottom: 8 }}>
                  {w.name}
                </h3>
                <p className="small" style={{ margin: 0, lineHeight: 1.5 }}>
                  {w.description}
                </p>
              </div>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: '1px solid var(--hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span className="small" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  Zero setup step
                </span>
                <span style={{ fontSize: 14, color: 'var(--accent)' }}>✓</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
