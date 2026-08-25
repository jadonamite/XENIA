'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function ClaimLinkCard({ link }: { link: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, {
      margin: 1,
      width: 220,
      color: { dark: '#17171a', light: '#ffffff' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        padding: '28px 24px',
        borderRadius: 24,
        background: 'var(--card-raised)',
        border: '1px solid var(--hairline)',
        boxShadow: '0 20px 50px rgba(10, 40, 70, 0.08), 0 2px 6px rgba(0,0,0,0.02)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 9999,
          background: 'rgba(16, 121, 74, 0.1)',
          color: '#10794a',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10794a' }} />
        Funds Locked &bull; Claim Link Ready
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
        Your Private Link is Live
      </h2>

      {/* QR Code Container */}
      {qr && (
        <div
          style={{
            display: 'inline-block',
            padding: 12,
            background: '#ffffff',
            borderRadius: 18,
            border: '1px solid var(--hairline)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            marginBottom: 18,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Claim link QR code"
            width={200}
            height={200}
            style={{ borderRadius: 10, display: 'block' }}
          />
        </div>
      )}

      {/* Link box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          marginBottom: 16,
          textAlign: 'left',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {link}
        </span>
        <button
          type="button"
          onClick={copy}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 8,
            border: 0,
            background: copied ? '#10794a' : 'var(--accent)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 160ms ease',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <p className="small" style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Anyone who holds this URL can claim the funds into any Starknet wallet. Send it over a channel you trust.
      </p>
    </div>
  );
}
