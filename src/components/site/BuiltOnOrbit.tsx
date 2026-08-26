'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TokenLogo } from '@/components/ui/TokenLogo';
import { Mark } from '@/components/site/Wordmark';
import { Reveal } from './Reveal';

interface OrbitNode {
  name: string;
  symbol: string;
  category: string;
  glowColor: string;
  angle: number; // in degrees
}

const NODES: OrbitNode[] = [
  { name: 'Starknet', symbol: 'STARKNET', category: 'L2 Validity Rollup', glowColor: 'rgba(236, 121, 107, 0.7)', angle: 270 },
  { name: 'Cairo', symbol: 'CAIRO', category: 'Provable Programming', glowColor: 'rgba(248, 106, 59, 0.7)', angle: 315 },
  { name: 'STRK20', symbol: 'STRK20', category: 'Private Token Standard', glowColor: 'rgba(19, 145, 226, 0.7)', angle: 0 },
  { name: 'Argent X', symbol: 'ARGENT', category: 'Account Abstraction', glowColor: 'rgba(255, 92, 0, 0.7)', angle: 45 },
  { name: 'Braavos', symbol: 'BRAAVOS', category: 'Hardware Security', glowColor: 'rgba(94, 123, 249, 0.7)', angle: 90 },
  { name: 'Cartridge', symbol: 'CARTRIDGE', category: 'Passkey Controller', glowColor: 'rgba(254, 224, 0, 0.75)', angle: 135 },
  { name: 'Next.js', symbol: 'NEXTJS', category: 'Zero-Leak App Router', glowColor: 'rgba(140, 80, 255, 0.6)', angle: 180 },
  { name: 'Vercel', symbol: 'VERCEL', category: 'Edge Distribution', glowColor: 'rgba(40, 40, 40, 0.5)', angle: 225 },
];

// Concentric discs behind the hub. Each is lifted by its own shadow, which is what turns the
// bloom into stepped depth instead of one blurred wash.
const BANDS = [
  { size: 396, fill: 0.14, rim: 0.78 },
  { size: 318, fill: 0.16, rim: 0.84 },
  { size: 242, fill: 0.19, rim: 0.9 },
  { size: 172, fill: 0.24, rim: 0.98 },
];

export function BuiltOnOrbit() {
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);

  const radius = 230; // Expanded orbit radius in pixels

  return (
    <section className="page section-tight centered" style={{ overflow: 'visible', paddingBlock: 60 }}>
      <Reveal>
        <div style={{ marginBottom: 36 }}>
          <span className="eyebrow">Integrations &amp; Ecosystem</span>
          <h2 className="head" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
            Built on the Starknet frontier.
          </h2>
          <p className="lede measure" style={{ margin: '14px auto 16px' }}>
            Seamlessly interoperable with native Cairo contracts, STRK20 tokens, and top Starknet wallets.
          </p>
          <Link
            href="/#ecosystem"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              transition: 'gap 180ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.gap = '10px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.gap = '6px';
            }}
          >
            <span>See all ecosystem integrations</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </Reveal>

      <div
        className="orbit-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 600,
          height: 540,
          margin: '24px auto 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/*
         * Two layers do different jobs. The hue layer carries the iridescence and drifts; the
         * bands are concentric discs stacked on top of it, each one lifted by its own shadow so
         * the colour reads as segmented depth rather than a single flat wash.
         */}
        <div
          className="orbit-aura"
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: [
              'radial-gradient(circle at 66% 20%, rgba(126, 232, 186, 0.82) 0%, transparent 55%)',
              'radial-gradient(circle at 88% 58%, rgba(136, 194, 250, 0.82) 0%, transparent 57%)',
              'radial-gradient(circle at 28% 76%, rgba(255, 178, 205, 0.82) 0%, transparent 57%)',
              'radial-gradient(circle at 18% 34%, rgba(196, 180, 246, 0.76) 0%, transparent 55%)',
            ].join(', '),
            filter: 'blur(34px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {BANDS.map((band, i) => (
          <div
            key={band.size}
            className="orbit-band"
            style={{
              position: 'absolute',
              width: band.size,
              height: band.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(255, 255, 255, ${band.fill}) 0%, rgba(255, 255, 255, 0) 74%)`,
              boxShadow: `inset 0 0 26px rgba(255, 255, 255, ${band.rim}), 0 14px 34px -16px rgba(24, 36, 66, 0.22)`,
              animationDelay: `${i * -1.6}s`,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        ))}

        {/* Thin orbit path, plus one inner guide so the bands have something to register against. */}
        <div
          style={{
            position: 'absolute',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.07)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.045)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* Central hub. Three nested plates, each with its own shadow, so the mark sits on a stack
            rather than on a single card. */}
        <div
          style={{
            position: 'relative',
            width: 152,
            height: 152,
            borderRadius: 46,
            background: 'rgba(255, 255, 255, 0.42)',
            boxShadow: '0 44px 88px -34px rgba(20, 32, 60, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 126,
              height: 126,
              borderRadius: 36,
              background: 'rgba(255, 255, 255, 0.78)',
              boxShadow:
                '0 26px 54px -24px rgba(20, 32, 60, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: 28,
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow:
                  '0 32px 64px -12px rgba(0, 0, 0, 0.20), 0 16px 32px -8px rgba(0, 0, 0, 0.10), 0 0 0 1px rgba(0, 0, 0, 0.03), inset 0 2px 0 rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mark size={58} id="orbit-center-mark" />
            </div>
          </div>
        </div>

        {/* Revolving Orbit Ring Track */}
        <div
          className="orbit-track"
          style={{
            position: 'absolute',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        >
          {NODES.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const isHovered = hoveredNode?.name === node.name;

            return (
              <div
                key={node.name}
                className="orbit-node"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  position: 'absolute',
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered ? 30 : 5,
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                {/* Counter-rotating container keeps satellite logos upright */}
                <div
                  className="orbit-node-inner"
                  style={{
                    position: 'relative',
                    width: 74,
                    height: 74,
                  }}
                >
                  {/* Colored ambient glow drop shadow under each tile */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: 26,
                      background: node.glowColor,
                      filter: 'blur(18px)',
                      opacity: isHovered ? 0.75 : 0.26,
                      transition: 'all 220ms ease',
                      transform: isHovered ? 'scale(1.35)' : 'scale(1)',
                      zIndex: -1,
                    }}
                  />

                  {/* Outer plate, then the tile. Same stacked-shadow idea as the hub, scaled down. */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 24,
                      background: 'rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 20px 40px -22px rgba(20, 32, 60, 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isHovered ? 'scale(1.12) translateY(-3px)' : 'none',
                      transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.05)',
                        boxShadow: isHovered
                          ? '0 20px 44px -12px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                          : '0 12px 28px -10px rgba(0, 0, 0, 0.16), 0 3px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'box-shadow 220ms ease',
                      }}
                    >
                      <TokenLogo symbol={node.symbol} size={32} />
                    </div>
                  </div>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 14px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '7px 16px',
                        borderRadius: 12,
                        background: '#ffffff',
                        border: '1px solid var(--hairline)',
                        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.15)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeIn 150ms ease',
                        textAlign: 'center',
                        zIndex: 40,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        {node.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
                        {node.category}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Status Indicator */}
      <div
        style={{
          marginTop: 24,
          minHeight: 28,
          fontSize: 13.5,
          color: hoveredNode ? 'var(--accent)' : 'var(--ink-2)',
          fontWeight: 500,
          transition: 'color 200ms ease',
        }}
      >
        {hoveredNode ? (
          <span>
            <strong style={{ color: 'var(--ink)' }}>{hoveredNode.name}</strong> &mdash; {hoveredNode.category}
          </span>
        ) : (
          'Hover over any integration to inspect'
        )}
      </div>
    </section>
  );
}
