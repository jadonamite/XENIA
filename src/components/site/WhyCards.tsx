'use client';

import { useState } from 'react';
import { Scatter } from './Scatter';
import { Reveal } from './Reveal';

interface WhyCardData {
  num: string;
  title: string;
  body: string;
  mockType: 'register' | 'fragment' | 'refund' | 'claim';
}

const CARDS_DATA: WhyCardData[] = [
  {
    num: '01.',
    title: 'Nobody registers first',
    body: 'The claim carries the setup. A recipient with no viewing key is paid in one transaction.',
    mockType: 'register',
  },
  {
    num: '02.',
    title: 'Nothing reaches a server',
    body: 'The key rides in the URL fragment. Our host never sees it, so it cannot spend it.',
    mockType: 'fragment',
  },
  {
    num: '03.',
    title: 'Expiry, not limbo',
    body: 'Unclaimed funds return to you on a timer. No unclaimed link is a permanent write-off.',
    mockType: 'refund',
  },
  {
    num: '04.',
    title: 'One screen, one signature',
    body: 'What the recipient sees is an amount and a button. Everything happens behind that button.',
    mockType: 'claim',
  },
];

export function WhyCards() {
  const [activeCard, setActiveCard] = useState<number>(3);

  return (
    <div className="cards">
      {CARDS_DATA.map((card, i) => {
        const isActive = activeCard === i;
        return (
          <Reveal key={card.num} delay={i * 60}>
            <div
              className={`card ${isActive ? 'card-raised' : ''}`}
              onMouseEnter={() => setActiveCard(i)}
              onClick={() => setActiveCard(i)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 320ms cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'translateY(-4px)' : 'none',
                boxShadow: isActive
                  ? '0 20px 48px rgba(10, 40, 70, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)'
                  : 'none',
                minHeight: 330,
              }}
            >
              {/* Top Section: Mock preview when active, Numeral + Scatter when inactive */}
              {isActive ? (
                <div style={{ marginBottom: 18, animation: 'fadeIn 300ms ease' }}>
                  {card.mockType === 'register' && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--card)',
                        borderRadius: 12,
                        border: '1px solid var(--hairline)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                          VIEWING KEY
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#10794a',
                            background: 'rgba(16, 121, 74, 0.12)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          AUTO-BUNDLED
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
                        0x049d…4dc7
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>
                        1-tx atomic phase 0 setup
                      </div>
                    </div>
                  )}

                  {card.mockType === 'fragment' && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--card)',
                        borderRadius: 12,
                        border: '1px solid var(--hairline)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                          URL FRAGMENT
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: 'var(--accent)',
                            background: 'rgba(19, 145, 226, 0.12)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          CLIENT-SIDE
                        </span>
                      </div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
                        /c#<span style={{ color: 'var(--accent)', fontWeight: 600 }}>a71f…9c02</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>
                        Browser never sends key to host
                      </div>
                    </div>
                  )}

                  {card.mockType === 'refund' && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--card)',
                        borderRadius: 12,
                        border: '1px solid var(--hairline)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                          EXPIRY TIMER
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#c2382f',
                            background: 'rgba(194, 56, 47, 0.12)',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          7 DAYS
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500 }}>Auto-Reclaim</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)' }}>
                          1-Click
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>
                        Zero permanent lock-in
                      </div>
                    </div>
                  )}

                  {card.mockType === 'claim' && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'var(--card)',
                        borderRadius: 12,
                        border: '1px solid var(--hairline)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>
                          AMOUNT
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#10794a' }}>
                          25.00 STRK
                        </span>
                      </div>
                      <div
                        style={{
                          padding: '7px 10px',
                          background: 'var(--pill)',
                          color: '#fff',
                          borderRadius: 8,
                          fontSize: 12,
                          textAlign: 'center',
                          fontWeight: 500,
                        }}
                      >
                        Claim with any Wallet
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-2)',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        No prior registration needed
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="card-numeral">{card.num}</span>
                  <Scatter count={9} offset={i * 4} style={{ top: '30%', bottom: '42%' }} />
                </>
              )}

              {/* Bottom Section: Title & Body */}
              <div style={{ position: 'relative', marginTop: 'auto' }}>
                <h3 className="card-title" style={{ fontSize: 20, marginBottom: 8 }}>
                  {card.title}
                </h3>
                <p className="small" style={{ marginBottom: 0, lineHeight: 1.5 }}>
                  {card.body}
                </p>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
