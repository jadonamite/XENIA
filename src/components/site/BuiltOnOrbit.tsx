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
        {/* Iridescent Multi-Color Concentric Halo Disk */}
        <div
          className="orbit-aura"
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 238, 217, 0.85) 0%, rgba(255, 206, 225, 0.6) 25%, rgba(180, 230, 245, 0.5) 50%, rgba(195, 210, 250, 0.45) 75%, transparent 95%)',
            filter: 'blur(36px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Concentric Decorative Halo Circles */}
        <div
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 330,
            height: 330,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            pointerEvents: 'none',
          }}
        />

        {/* Thin Orbit Path Line */}
        <div
          style={{
            position: 'absolute',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            pointerEvents: 'none',
          }}
        />

        {/* Central Hub with Big Xenia Logo & Deep 3D Drop Shadow */}
        <div
          style={{
            position: 'relative',
            width: 118,
            height: 118,
            borderRadius: 32,
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
          <Mark size={64} id="orbit-center-mark" />
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
                    width: 68,
                    height: 68,
                  }}
                >
                  {/* Colored ambient glow drop shadow under each tile */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: -10,
                      borderRadius: 26,
                      background: node.glowColor,
                      filter: 'blur(16px)',
                      opacity: isHovered ? 1 : 0.8,
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
                      borderRadius: 22,
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
                      padding: 14,
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
