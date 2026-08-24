'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * The finished link, shown once.
 *
 * The QR is rendered in the browser from the link itself — sending the link to an image service to
 * be drawn would hand the key to that service.
 */
export function ClaimLinkCard({ link }: { link: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: '#0b0d12', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>The link is live</h2>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="Claim link QR code" width={240} height={240} style={{ borderRadius: 8 }} />
      )}
      <p className="mono">{link}</p>
      <div className="row">
        <button onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
      <p className="note">
        Anyone holding this link can claim it. Send it over a channel you would trust with cash.
      </p>
    </div>
  );
}
