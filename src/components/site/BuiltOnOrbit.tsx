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
         * The bloom is a set of off-centre colour blobs inside one circle, not concentric rings.
         * Concentric stops average out to flat grey; separated hues keep the iridescence readable.
         */}
        <div
          className="orbit-aura"
          style={{
            position: 'absolute',
            width: 366,
            height: 366,
            borderRadius: '50%',
            background: [
              'radial-gradient(circle at 66% 20%, rgba(126, 232, 186, 0.78) 0%, transparent 58%)',
              'radial-gradient(circle at 88% 58%, rgba(136, 194, 250, 0.78) 0%, transparent 60%)',
              'radial-gradient(circle at 28% 76%, rgba(255, 178, 205, 0.78) 0%, transparent 60%)',
              'radial-gradient(circle at 18% 34%, rgba(196, 180, 246, 0.72) 0%, transparent 58%)',
              'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 62%)',
            ].join(', '),
            filter: 'blur(38px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 196,
            height: 196,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.18) 55%, transparent 100%)',
            filter: 'blur(28px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* One ring, at the orbit radius. The extra inner circles read as clutter against the bloom. */}
        <div
          style={{
            position: 'absolute',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.07)',
            pointerEvents: 'none',
          }}
        />

        {/* Central Hub with Big Xenia Logo & Deep 3D Drop Shadow */}
        <div
          style={{
            position: 'relative',
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
            zIndex: 10,
          }}
        >
          <Mark size={58} id="orbit-center-mark" />
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
                    width: 58,
                    height: 58,
                  }}
                >
                  {/* Colored ambient glow drop shadow under each tile */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: -8,
                      borderRadius: 22,
                      background: node.glowColor,
                      filter: 'blur(18px)',
                      opacity: isHovered ? 0.75 : 0.26,
                      transition: 'all 220ms ease',
                      transform: isHovered ? 'scale(1.35)' : 'scale(1)',
                      zIndex: -1,
                    }}
                  />

                  {/* Satellite Squircle Tile */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 18,
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      boxShadow: isHovered
                        ? '0 20px 48px rgba(0, 0, 0, 0.18)'
                        : '0 12px 28px -3px rgba(0, 0, 0, 0.09), 0 3px 8px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isHovered ? 'scale(1.15) translateY(-3px)' : 'none',
                      transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      padding: 11,
                    }}
                  >
                    <TokenLogo symbol={node.symbol} size={34} />
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
