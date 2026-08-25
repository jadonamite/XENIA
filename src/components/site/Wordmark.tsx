/**
 * The official Xenia logo mark from public/Xenia.png.
 */
export function Mark({ size = 24 }: { size?: number; id?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/Xenia.png"
      alt="Xenia"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
}

export function Wordmark({ size = 26 }: { id?: string; size?: number }) {
  return (
    <span className="wordmark" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Xenia.png"
        alt="Xenia Logo"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      />
      <span>Xenia</span>
    </span>
  );
}

