import React from 'react';

export type TokenSymbol =
  | 'STRK'
  | 'STRK20'
  | 'ETH'
  | 'ETHEREUM'
  | 'USDC'
  | 'STARKNET'
  | 'CAIRO'
  | 'NEXTJS'
  | 'VERCEL'
  | 'ARGENT'
  | 'BRAAVOS'
  | 'CARTRIDGE';

interface TokenLogoProps {
  symbol: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const LOGO_MAP: Record<string, { src: string; alt: string }> = {
  STRK20: { src: '/logos/strk20-mark.png', alt: 'STRK20' },
  STRK: { src: '/logos/strk.png', alt: 'STRK' },
  STARKNET: { src: '/logos/starknet.png', alt: 'Starknet' },
  ETH: { src: '/logos/eth.svg', alt: 'Ethereum' },
  ETHEREUM: { src: '/logos/eth.svg', alt: 'Ethereum' },
  USDC: { src: '/logos/usdc.png', alt: 'USDC' },
  CAIRO: { src: '/logos/cairo.png', alt: 'Cairo' },
  ARGENT: { src: '/logos/argent.svg', alt: 'Argent X' },
  BRAAVOS: { src: '/logos/braavos.svg', alt: 'Braavos' },
  CARTRIDGE: { src: '/logos/cartridge.svg', alt: 'Cartridge Controller' },
  NEXTJS: { src: '/logos/nextjs.svg', alt: 'Next.js' },
  VERCEL: { src: '/logos/vercel.svg', alt: 'Vercel' },
};

// Only the coin marks are drawn as discs. Rounding the rest would crop the wordmark logos.
const ROUND = new Set(['STRK', 'ETH', 'ETHEREUM', 'USDC']);

export function TokenLogo({ symbol, size = 24, className, style }: TokenLogoProps) {
  const norm = symbol.toUpperCase();
  const logo = LOGO_MAP[norm];

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.src}
        alt={logo.alt}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: ROUND.has(norm) ? '50%' : 6,
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        fontWeight: 700,
        ...style,
      }}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
