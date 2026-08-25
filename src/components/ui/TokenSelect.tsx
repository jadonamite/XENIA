'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TOKENS, type Token } from '@/lib/xenia/config';
import { TokenLogo } from './TokenLogo';

interface TokenSelectProps {
  value: string;
  onChange: (symbol: string) => void;
}

const TOKEN_META: Record<string, { name: string }> = {
  STRK: { name: 'Starknet Token' },
  ETH: { name: 'Ether' },
  USDC: { name: 'USD Coin' },
};

export function TokenSelect({ value, onChange }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedToken = TOKENS.find((t) => t.symbol === value) ?? TOKENS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 8px',
          borderRadius: 9999,
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          color: 'var(--ink)',
          cursor: 'pointer',
          transition: 'all 160ms ease',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-raised)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.borderColor = 'var(--hairline)';
        }}
      >
        <TokenLogo symbol={selectedToken.symbol} size={22} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedToken.symbol}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 180ms ease',
            color: 'var(--ink-3)',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 220,
            padding: 6,
            borderRadius: 14,
            background: 'var(--card-raised)',
            border: '1px solid var(--hairline)',
            boxShadow: '0 12px 32px rgba(10, 40, 70, 0.12), 0 2px 6px rgba(0,0,0,0.04)',
            zIndex: 60,
            animation: 'fadeIn 150ms ease',
          }}
        >
          <div style={{ padding: '6px 10px 8px', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
            SELECT TOKEN
          </div>
          {TOKENS.map((token: Token) => {
            const isSelected = token.symbol === value;
            const meta = TOKEN_META[token.symbol] ?? { name: token.symbol };

            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => {
                  onChange(token.symbol);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 0,
                  background: isSelected ? 'rgba(19, 145, 226, 0.08)' : 'transparent',
                  color: isSelected ? 'var(--accent)' : 'var(--ink)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--card)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TokenLogo symbol={token.symbol} size={24} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                      {token.symbol}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                      {meta.name}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
