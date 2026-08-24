'use client';

import { useState } from 'react';
import { AppMock, type MockVariant } from './AppMock';
import { Paint } from './Paint';

const STEPS: { label: string; variant: MockVariant; caption: string }[] = [
  {
    label: 'Lock the funds',
    variant: 'create',
    caption: 'One STRK20 transaction moves the amount out of your private balance and into escrow.',
  },
  {
    label: 'Share the link',
    variant: 'link',
    caption: 'The key lives in the URL fragment, which browsers never send to a server.',
  },
  {
    label: 'They claim it',
    variant: 'claim',
    caption: 'Registration and payment land in the same transaction, so there is no setup step.',
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div className="panel-paint" style={{ padding: '28px 20px 0' }}>
      <Paint variant="tide" id="how" />

      <div className="row" style={{ justifyContent: 'center' }}>
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: 0,
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 14.5,
              fontWeight: 500,
              background: i === active ? '#fff' : 'rgba(255,255,255,0.45)',
              color: i === active ? 'var(--ink)' : 'var(--ink-2)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* The tide paint is pale, so the caption gets its own plate rather than sitting on the wash. */}
      <p
        className="small centered"
        style={{
          maxWidth: '46ch',
          margin: '16px auto 0',
          padding: '10px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.72)',
          color: 'var(--ink)',
        }}
      >
        {step.caption}
      </p>

      <div style={{ maxWidth: 460, margin: '24px auto 0', paddingBottom: 0 }}>
        <div style={{ transform: 'translateY(24px)' }}>
          <AppMock variant={step.variant} />
        </div>
      </div>
    </div>
  );
}
