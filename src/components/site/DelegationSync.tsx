'use client';

import { useState } from 'react';
import { Paint } from './Paint';

export interface DelegationItem {
  title: string;
  body: string;
}

const DELEGATION_ITEMS: DelegationItem[] = [
  {
    title: 'Register inside the claim',
    body: 'Setting a viewing key is phase 0 and an external invoke is phase 7, so both fit in one STRK20 transaction. The recipient never sees a setup step, because there is not one.',
  },
  {
    title: 'Open notes, not fixed amounts',
    body: 'The claim opens a note whose amount is measured at execution. The escrow names the figure, so the claimant never has to restate an amount the sender chose.',
  },
  {
    title: 'A signature, not a password',
    body: 'The link carries a private key. Claiming signs the claimant’s own address, so a claim lifted out of the mempool authorises an address the thief does not control.',
  },
  {
    title: 'Refund without a rescue script',
    body: 'Every link has an expiry and a refund path keyed to the sender. Getting your money back is a button, not a support ticket.',
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
  padding: '12px 16px',
  borderBottom: '1px solid var(--hairline)',
  fontSize: 13.5,
};

export function DelegationSync() {
  const [active, setActive] = useState(0);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 56,
        alignItems: 'center',
        marginTop: 48,
      }}
      className="delegation"
    >
      <div>
        {DELEGATION_ITEMS.map((item, i) => {
          const isOpen = active === i;
          return (
            <div
              key={item.title}
              className={['acc-row', isOpen && 'acc-open'].filter(Boolean).join(' ')}
              style={{ transition: 'all 240ms ease' }}
            >
              <button
                className="acc-head"
                aria-expanded={isOpen}
                onClick={() => setActive(i)}
                style={{
                  color: isOpen ? 'var(--ink)' : 'var(--ink-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: isOpen ? 'var(--accent)' : 'var(--card)',
                    color: isOpen ? '#fff' : 'var(--ink-2)',
                    transition: 'all 200ms ease',
                  }}
                >
                  0{i + 1}
                </span>
                <span style={{ flex: 1 }}>{item.title}</span>
                <span
                  className="acc-mark"
                  aria-hidden
                  style={{
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 200ms ease',
                  }}
                >
                  ›
                </span>
              </button>
              <div className="acc-body">
                <div>
                  <p style={{ paddingLeft: 36 }}>{item.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel-paint" style={{ padding: '36px 28px' }}>
        <Paint variant="tide" id="deleg" />

        <div
          style={{
            background: 'var(--card-raised)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 22px 60px rgba(10, 40, 70, 0.16)',
            transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {chrome}

          {/* Screen 0: Register inside the claim */}
          {active === 0 && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">STRK20 Batch Execution</span>
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
                  1 ATOMIC TX
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={rowStyle}>
                  <span className="small">Phase 0: SetViewingKey</span>
                  <span style={{ color: '#10794a', fontWeight: 500 }}>Auto-registers user</span>
                </div>
                <div style={rowStyle}>
                  <span className="small">Phase 1-2: OpenChannel</span>
                  <span className="small">Opens note channels</span>
                </div>
                <div style={rowStyle}>
                  <span className="small">Phase 5: CreateOpenNote</span>
                  <span className="small">Prepares balance slot</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span className="small">Phase 7: InvokeEscrow</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Credits private funds</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--card)',
                  fontSize: 12.5,
                  color: 'var(--ink-2)',
                  textAlign: 'center',
                }}
              >
                Zero pre-setup required. Recipient signs once.
              </div>
            </div>
          )}

          {/* Screen 1: Open notes, not fixed amounts */}
          {active === 1 && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Note Amount Evaluation</span>
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
                  MEASURED AT RUNTIME
                </span>
              </div>
              <div style={{ marginTop: 14, textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  25.00 <span style={{ color: 'var(--accent)', fontSize: 24 }}>STRK</span>
                </div>
                <p className="small" style={{ margin: '6px 0 0' }}>
                  Escrow verified commitment &bull; No amount parameter passed by claimant
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                <div style={rowStyle}>
                  <span className="small">Escrow lock</span>
                  <span className="mono">25000000000000000000</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span className="small">Note status</span>
                  <span style={{ color: '#10794a', fontWeight: 500 }}>Ready to spend on maturity</span>
                </div>
              </div>
            </div>
          )}

          {/* Screen 2: A signature, not a password */}
          {active === 2 && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Mempool-Proof Claim Signature</span>
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
                  SCHNORR / POSEIDON
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={rowStyle}>
                  <span className="small">Authorized recipient</span>
                  <span className="mono" style={{ color: 'var(--accent)' }}>0x049d…4dc7</span>
                </div>
                <div style={rowStyle}>
                  <span className="small">Signature (r, s)</span>
                  <span className="mono">0x6e2a…8b19</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span className="small">Mempool safety</span>
                  <span style={{ color: '#10794a', fontWeight: 500 }}>Front-run resistant</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--card)',
                  fontSize: 12.5,
                  color: 'var(--ink-2)',
                  textAlign: 'center',
                }}
              >
                Signature binds specifically to claimant address. Replay is impossible.
              </div>
            </div>
          )}

          {/* Screen 3: Refund without a rescue script */}
          {active === 3 && (
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="small">Sender Escrow Management</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(194, 56, 47, 0.12)',
                    color: '#c2382f',
                  }}
                >
                  EXPIRED
                </span>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={rowStyle}>
                  <span className="small">Lock duration</span>
                  <span>7 days (Passed)</span>
                </div>
                <div style={rowStyle}>
                  <span className="small">Refund recipient</span>
                  <span className="mono">0x038b…21f0 (Sender)</span>
                </div>
                <div style={{ ...rowStyle, borderBottom: 0 }}>
                  <span className="small">Rescue status</span>
                  <span style={{ color: '#10794a', fontWeight: 500 }}>Instant reclaim available</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--pill)',
                  color: '#fff',
                  fontSize: 13.5,
                  fontWeight: 500,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                Refund 25 STRK to Balance
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
