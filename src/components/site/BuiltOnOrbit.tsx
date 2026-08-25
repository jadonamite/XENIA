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
  angle: number; // in degrees along 360 circle
}

const NODES: OrbitNode[] = [
  { name: 'STRK20', symbol: 'STRK20', category: 'Private Token Standard', glowColor: 'rgba(19, 145, 226, 0.45)', angle: 0 },
  { name: 'Cairo', symbol: 'CAIRO', category: 'Provable Programming', glowColor: 'rgba(248, 106, 59, 0.45)', angle: 45 },
  { name: 'Starknet', symbol: 'STARKNET', category: 'L2 Validity Rollup', glowColor: 'rgba(236, 121, 107, 0.45)', angle: 90 },
  { name: 'Argent X', symbol: 'ARGENT', category: 'Account Abstraction', glowColor: 'rgba(255, 92, 0, 0.45)', angle: 135 },
  { name: 'Braavos', symbol: 'BRAAVOS', category: 'Hardware Security', glowColor: 'rgba(94, 123, 249, 0.45)', angle: 180 },
  { name: 'Cartridge', symbol: 'CARTRIDGE', category: 'Passkey Controller', glowColor: 'rgba(254, 224, 0, 0.45)', angle: 225 },
  { name: 'Next.js', symbol: 'NEXTJS', category: 'Zero-Leak App Router', glowColor: 'rgba(140, 80, 255, 0.4)', angle: 270 },
  { name: 'Vercel', symbol: 'VERCEL', category: 'Edge Distribution', glowColor: 'rgba(0, 0, 0, 0.3)', angle: 315 },
];

export function BuiltOnOrbit() {
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);

  const radius = 180; // orbit radius in px

  return (
    <section className="page section-tight centered" style={{ overflow: 'visible', paddingBlock: 40 }}>
      <Reveal>
        <div style={{ marginBottom: 36 }}>
          <span className="eyebrow">Ecosystem &amp; Integrations</span>
          <h2 className="head" style={{ maxWidth: '20ch', marginInline: 'auto' }}>
            Built on the Starknet frontier.
          </h2>
          <p className="lede measure" style={{ margin: '14px auto 0' }}>
            Powered by Cairo, STRK20 private contracts, and next-generation account abstraction.
          </p>
        </div>
      </Reveal>

      <div
        className="orbit-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: 460,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Iridescent Gradient Concentric Rings */}
        <div
          className="orbit-aura"
          style={{
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(19, 145, 226, 0.25) 0%, rgba(236, 121, 107, 0.20) 35%, rgba(140, 80, 255, 0.16) 65%, transparent 80%)',
            filter: 'blur(32px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Concentric Decorative Halo Rings */}
        <div
          style={{
            position: 'absolute',
            width: 250,
            height: 250,
            borderRadius: '50%',
            border: '1px solid rgba(19, 145, 226, 0.1)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: '50%',
            border: '1px dashed rgba(23, 23, 26, 0.1)',
            pointerEvents: 'none',
          }}
        />

        {/* Central Hub with App Logo */}
        <div
          style={{
            position: 'relative',
            width: 86,
            height: 86,
            borderRadius: 24,
            background: '#ffffff',
            border: '1px solid var(--hairline)',
            boxShadow:
              '0 20px 48px rgba(10, 40, 70, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Mark size={48} id="orbit-center-mark" />
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
                {/* Counter-rotating inner container keeps satellite icons upright */}
                <div
                  className="orbit-node-inner"
                  style={{
                    position: 'relative',
                    width: 52,
                    height: 52,
                  }}
                >
                  {/* Soft ambient glow blob behind satellite */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: 18,
                      background: node.glowColor,
                      filter: 'blur(10px)',
                      opacity: isHovered ? 1 : 0.5,
                      transition: 'all 200ms ease',
                      transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                      zIndex: -1,
                    }}
                  />

                  {/* Satellite Tile */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 16,
                      background: '#ffffff',
                      border: '1px solid var(--hairline)',
                      boxShadow: isHovered
                        ? '0 14px 32px rgba(0, 0, 0, 0.16)'
                        : '0 6px 18px rgba(0, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isHovered ? 'scale(1.18) translateY(-2px)' : 'none',
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
                        bottom: 'calc(100% + 10px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 12px',
                        borderRadius: 10,
                        background: 'var(--card-raised)',
                        border: '1px solid var(--hairline)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeIn 150ms ease',
                        textAlign: 'center',
                        zIndex: 40,
                      }}
                    >
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
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

      {/* Dynamic Status Bar beneath Orbit */}
      <div
        style={{
          marginTop: 20,
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
          'Hover over any integration to pause & inspect'
        )}
      </div>
    </section>
  );
}
