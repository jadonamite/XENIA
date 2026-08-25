'use client';

import { useState } from 'react';
import { Paint } from './Paint';

const STEPS = [
  {
    num: '01',
    label: 'Lock the funds',
    caption: 'One STRK20 transaction moves the amount out of your private balance and into escrow.',
  },
  {
    num: '02',
    label: 'Share the link',
    caption: 'The key lives in the URL fragment, which browsers never send to a server.',
  },
  {
    num: '03',
    label: 'They claim it',
    caption: 'Registration and payment land in the same transaction, so there is no setup step.',
  },
];

const chrome = (
  <div
    style={{
      display: 'flex',
      gap: 6,
      padding: '12px 14px',
      borderBottom: '1px solid var(--hairline)',
    }}
    aria-hidden
  >
    {['#e8695f', '#e9b44c', '#57ba6a'].map((colour) => (
      <span
        key={colour}
        style={{ width: 10, height: 10, borderRadius: 999, background: colour }}
      />
    ))}
  </div>
);

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '13px 18px',
  borderBottom: '1px solid var(--hairline)',
  fontSize: 14,
};

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [amount, setAmount] = useState('25');

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleClaim = () => {
    setClaimed(true);
    setTimeout(() => setClaimed(false), 3000);
  };

  return (
    <div className="panel-paint" style={{ padding: '32px 20px 0' }}>
      <Paint variant="tide" id="how" />

      {/* Tab bar with sliding pill effect */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 4,
            borderRadius: 9999,
            background: 'rgba(255, 255, 255, 0.48)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
          role="tablist"
        >
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <button
                key={s.label}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(i)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 18px',
                  borderRadius: 9999,
                  border: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                  boxShadow: isActive ? '0 2px 10px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? 'var(--accent)' : 'var(--ink-3)',
                    transition: 'color 280ms ease',
                  }}
                >
                  {s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Caption card */}
      <p
        className="small centered"
        style={{
          maxWidth: '48ch',
          margin: '18px auto 0',
          padding: '10px 18px',
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          color: 'var(--ink)',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        {STEPS[active].caption}
      </p>

      {/* Interactive Mock Card */}
      <div style={{ maxWidth: 480, margin: '26px auto 0', paddingBottom: 0 }}>
        <div
          style={{
            transform: 'translateY(24px)',
            background: 'var(--card-raised)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 22px 60px rgba(10, 40, 70, 0.16)',
            transition: 'all 300ms ease',
          }}
        >
          {chrome}

          {/* Step 0: Lock the funds */}
          {active === 0 && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Deposit into Escrow</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['10', '25', '100'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        border: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: amount === val ? 'var(--accent)' : 'var(--card)',
                        color: amount === val ? '#fff' : 'var(--ink-2)',
                        transition: 'all 160ms ease',
                      }}
                    >
                      {val} STRK
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 10 }}>
                {amount} <span style={{ fontSize: 22, color: 'var(--accent)' }}>STRK</span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={rowStyle}>
                  <span className="small">Leaves</span>
                  <span>your private balance</span>
                </div>
                <div style={rowStyle}>
                  <span className="small">Expires</span>
                  <span>in 7 days</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span className="small">Refund to</span>
                  <span className="mono">0x049d…4dc7</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--pill)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                Lock funds and get a link
              </div>
            </div>
          )}

          {/* Step 1: Share the link */}
          {active === 1 && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Send this to anyone</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(19, 145, 226, 0.12)',
                    color: 'var(--accent)',
                  }}
                >
                  ZERO SERVER LEAK
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  usexenia.vercel.app/c#<span style={{ color: 'var(--accent)', fontWeight: 600 }}>a71f…9c02</span>
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 0,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: copied ? '#10794a' : 'var(--pill)',
                    color: '#fff',
                    transition: 'all 200ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              {/* Synthetic visual QR mock */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  width: 120,
                  margin: '16px auto 10px',
                  padding: 8,
                  borderRadius: 8,
                  background: '#fff',
                  border: '1px solid var(--hairline)',
                }}
                aria-hidden
              >
                {Array.from({ length: 49 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 2,
                      background: (i * 7 + (i % 5)) % 3 ? 'var(--ink)' : 'var(--accent-3)',
                    }}
                  />
                ))}
              </div>

              <p className="small centered" style={{ margin: 0, fontSize: 12.5 }}>
                Key lives after the <span className="mono">#</span>. Browsers never transmit fragments.
              </p>
            </div>
          )}

          {/* Step 2: They claim it */}
          {active === 2 && (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Recipient claim screen</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(16, 121, 74, 0.12)',
                    color: '#10794a',
                  }}
                >
                  READY TO CLAIM
                </span>
              </div>

              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 10 }}>
                25.00 <span style={{ fontSize: 22, color: 'var(--accent)' }}>STRK</span>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={rowStyle}>
                  <span>Register viewing key</span>
                  <span className="small" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    same transaction
                  </span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span>Credit private note</span>
                  <span className="small" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    same transaction
                  </span>
                </div>
              </div>

              <button
                onClick={handleClaim}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 0,
                  cursor: 'pointer',
                  background: claimed ? '#10794a' : 'var(--pill)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'center',
                  transition: 'all 240ms ease',
                }}
              >
                {claimed ? '✓ Claimed into private balance!' : 'Claim 25 STRK'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
