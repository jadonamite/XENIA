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

export function TokenLogo({ symbol, size = 24, className, style }: TokenLogoProps) {
  const norm = symbol.toUpperCase();

  switch (norm) {
    case 'STRK20':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/STRK20.avif"
          alt="STRK20"
          width={size}
          height={size}
          className={className}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: '50%',
            flexShrink: 0,
            ...style,
          }}
          onError={(e) => {
            // Fallback to vector Starknet star if avif is not rendered
            e.currentTarget.style.display = 'none';
          }}
        />
      );

    case 'STRK':
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/STRK20.avif"
          alt="STRK"
          width={size}
          height={size}
          className={className}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: '50%',
            flexShrink: 0,
            ...style,
          }}
        />
      );

    case 'STARKNET':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ borderRadius: '50%', flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="16" fill="#0C0C4F" />
          <path
            d="M16 6L18.6 13.4L26 16L18.6 18.6L16 26L13.4 18.6L6 16L13.4 13.4L16 6Z"
            fill="#EC796B"
          />
          <path
            d="M16 11L17.5 14.5L21 16L17.5 17.5L16 21L14.5 17.5L11 16L14.5 14.5L16 11Z"
            fill="#FFFFFF"
          />
          <circle cx="23.5" cy="8.5" r="2" fill="#EC796B" />
          <circle cx="8.5" cy="23.5" r="2" fill="#EC796B" />
        </svg>
      );

    case 'ETH':
    case 'ETHEREUM':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ borderRadius: '50%', flexShrink: 0, ...style }}
        >
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path
            d="M16.498 4v8.87l7.497 3.35L16.498 4z"
            fill="#FFFFFF"
            fillOpacity="0.602"
          />
          <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#FFFFFF" />
          <path
            d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z"
            fill="#FFFFFF"
            fillOpacity="0.602"
          />
          <path d="M16.498 27.995v-6.027L9 17.616l7.498 10.38z" fill="#FFFFFF" />
          <path
            d="M16.498 20.573l7.497-4.353-7.497-3.348v7.7z"
            fill="#FFFFFF"
            fillOpacity="0.2"
          />
          <path d="M9 16.22l7.498 4.353v-7.7L9 16.22z" fill="#FFFFFF" fillOpacity="0.602" />
        </svg>
      );

    case 'USDC':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ borderRadius: '50%', flexShrink: 0, ...style }}
        >
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            d="M16 6.5C10.75 6.5 6.5 10.75 6.5 16C6.5 21.25 10.75 25.5 16 25.5C21.25 25.5 25.5 21.25 25.5 16C25.5 10.75 21.25 6.5 16 6.5ZM16 23.8C11.69 23.8 8.2 20.31 8.2 16C8.2 11.69 11.69 8.2 16 8.2C20.31 8.2 23.8 11.69 23.8 16C23.8 20.31 20.31 23.8 16 23.8Z"
            fill="#FFFFFF"
            fillOpacity="0.4"
          />
          <path
            d="M17.2 14.1C15.6 13.6 15 13.2 15 12.3C15 11.4 15.8 10.7 17.1 10.7C18.3 10.7 19 11.3 19.3 12.3H21.2C20.9 10.4 19.4 9.1 17.5 8.8V7.5H15.5V8.8C13.6 9.1 12.2 10.3 12.2 12.3C12.2 14.4 13.6 15.4 15.8 16C17.6 16.6 18.2 17.1 18.2 18.1C18.2 19.1 17.3 19.8 15.9 19.8C14.4 19.8 13.6 19 13.3 17.8H11.3C11.6 20 13.2 21.3 15.5 21.6V23H17.5V21.6C19.5 21.3 21 20.1 21 18C21 15.6 19.4 14.7 17.2 14.1Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'CAIRO':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="8" fill="#F86A3B" />
          <path
            d="M23 16C23 19.866 19.866 23 16 23C12.134 23 9 19.866 9 16C9 12.134 12.134 9 16 9C18.5 9 20.7 10.3 21.9 12.3L19.2 14C18.5 12.8 17.3 12 16 12C13.8 12 12 13.8 12 16C12 18.2 13.8 20 16 20C17.3 20 18.5 19.2 19.2 18L21.9 19.7C20.7 21.7 18.5 23 16 23"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'NEXTJS':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="16" fill="#000000" />
          <path
            d="M22.5 23.5L13.8 12.3H11.5V20.7H13.2V14.5L21.2 24.6C21.6 24.3 22.1 23.9 22.5 23.5ZM18.7 12.3H20.4V18.8L18.7 16.7V12.3Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'VERCEL':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="8" fill="#000000" />
          <path d="M16 8L25 23.5H7L16 8Z" fill="#FFFFFF" />
        </svg>
      );

    case 'ARGENT':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="8" fill="#FF5C00" />
          <path
            d="M16 7L24 23H19.5L16 15.5L12.5 23H8L16 7Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'BRAAVOS':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="8" fill="#1C3879" />
          <path
            d="M16 8L23 11.5V17C23 21.5 19.8 24.5 16 26C12.2 24.5 9 21.5 9 17V11.5L16 8Z"
            fill="#5E7BF9"
          />
          <path
            d="M16 11L20.5 13.2V17C20.5 19.8 18.5 22 16 23.2C13.5 22 11.5 19.8 11.5 17V13.2L16 11Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'CARTRIDGE':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={{ flexShrink: 0, ...style }}
        >
          <rect width="32" height="32" rx="8" fill="#1A1A1A" />
          <rect x="8" y="10" width="16" height="12" rx="3" fill="#FEE000" />
          <circle cx="12" cy="16" r="1.5" fill="#1A1A1A" />
          <rect x="18" y="14" width="4" height="1.5" rx="0.5" fill="#1A1A1A" />
          <rect x="19.25" y="12.75" width="1.5" height="4" rx="0.5" fill="#1A1A1A" />
        </svg>
      );

    default:
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
}
