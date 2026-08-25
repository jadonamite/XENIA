'use client';

import React, { useState } from 'react';
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
  { name: 'Starknet', symbol: 'STARKNET', category: 'L2 Validity Rollup', glowColor: 'rgba(236, 121, 107, 0.4)', angle: 270 },
  { name: 'Cairo', symbol: 'CAIRO', category: 'Provable Programming', glowColor: 'rgba(248, 106, 59, 0.4)', angle: 315 },
  { name: 'STRK20', symbol: 'STRK20', category: 'Private Token Standard', glowColor: 'rgba(19, 145, 226, 0.4)', angle: 0 },
  { name: 'Argent X', symbol: 'ARGENT', category: 'Account Abstraction', glowColor: 'rgba(255, 92, 0, 0.4)', angle: 45 },
  { name: 'Braavos', symbol: 'BRAAVOS', category: 'Hardware Security', glowColor: 'rgba(94, 123, 249, 0.4)', angle: 90 },
  { name: 'Cartridge', symbol: 'CARTRIDGE', category: 'Passkey Controller', glowColor: 'rgba(254, 224, 0, 0.4)', angle: 135 },
  { name: 'Next.js', symbol: 'NEXTJS', category: 'Zero-Leak App Router', glowColor: 'rgba(140, 80, 255, 0.35)', angle: 180 },
  { name: 'Vercel', symbol: 'VERCEL', category: 'Edge Distribution', glowColor: 'rgba(0, 0, 0, 0.25)', angle: 225 },
];

export function BuiltOnOrbit() {
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);

  const radius = 175; // Orbit radius in px

  return (
    <section className="page section-tight centered" style={{ overflow: 'visible', paddingBlock: 48 }}>
      <Reveal>
        <div style={{ marginBottom: 32 }}>
          <span className="eyebrow">Ecosystem &amp; Architecture</span>
          <h2 className="head" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
            Built on the Starknet frontier.
          </h2>
          <p className="lede measure" style={{ margin: '14px auto 0' }}>
            Powered by Cairo, STRK20 private contracts, and next-generation account abstraction.
          </p>
        </div>
      </Reveal>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          height: 440,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Iridescent Gradient Concentric Rings */}
        <div
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(19, 145, 226, 0.18) 0%, rgba(236, 121, 107, 0.15) 35%, rgba(140, 80, 255, 0.12) 65%, transparent 80%)',
            filter: 'blur(28px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Concentric Halo Rings */}
        <div
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            border: '1px solid rgba(19, 145, 226, 0.08)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 350,
            height: 350,
            borderRadius: '50%',
            border: '1px solid rgba(23, 23, 26, 0.06)',
            pointerEvents: 'none',
          }}
        />

        {/* Central Xenia Logo Card */}
        <div
          style={{
            position: 'relative',
            width: 82,
            height: 82,
            borderRadius: 22,
            background: '#ffffff',
            border: '1px solid var(--hairline)',
            boxShadow:
              '0 16px 40px rgba(10, 40, 70, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Mark size={44} id="orbit-center-mark" />
        </div>

        {/* Orbiting Satellite Nodes */}
        {NODES.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const isHovered = hoveredNode?.name === node.name;

          return (
            <div
              key={node.name}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                zIndex: isHovered ? 20 : 5,
                cursor: 'pointer',
              }}
            >
              {/* Soft glow behind satellite tile */}
              <div
                style={{
                  position: 'absolute',
                  inset: -6,
                  borderRadius: 18,
                  background: node.glowColor,
                  filter: 'blur(10px)',
                  opacity: isHovered ? 0.9 : 0.45,
                  transition: 'opacity 200ms ease, transform 200ms ease',
                  transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                  zIndex: -1,
                }}
              />

              {/* Satellite Node Tile */}
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  background: '#ffffff',
                  border: '1px solid var(--hairline)',
                  boxShadow: isHovered
                    ? '0 12px 28px rgba(0, 0, 0, 0.14)'
                    : '0 4px 14px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isHovered ? 'scale(1.15) translateY(-2px)' : 'none',
                  transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <TokenLogo symbol={node.symbol} size={28} />
              </div>

              {/* Tooltip on hover */}
              {isHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '5px 10px',
                    borderRadius: 8,
                    background: 'var(--card-raised)',
                    border: '1px solid var(--hairline)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    animation: 'fadeIn 150ms ease',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>
                    {node.category}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Node Info Banner */}
      <div
        style={{
          marginTop: 24,
          minHeight: 28,
          fontSize: 13.5,
          color: hoveredNode ? 'var(--accent)' : 'var(--ink-3)',
          fontWeight: 500,
          transition: 'color 200ms ease',
        }}
      >
        {hoveredNode
          ? `${hoveredNode.name} — ${hoveredNode.category}`
          : 'Hover over any node to explore the integration'}
      </div>
    </section>
  );
}
