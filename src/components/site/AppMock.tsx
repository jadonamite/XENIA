/**
 * Static renderings of the real product screens, for the marketing page.
 *
 * Deliberately not the live components: these have to render identically on the server, with no
 * wallet, no network and no empty states, and dressing the real ones up to do that would put
 * marketing conditionals inside the claim path.
 */

const chrome = (
  <div
    style={{
      display: 'flex',
      gap: 6,
      padding: '12px 14px',
      borderBottom: '1px solid var(--hairline)',
    }}
    aria-hidden
  >
    {['#e8695f', '#e9b44c', '#57ba6a'].map((colour) => (
      <span
        key={colour}
        style={{ width: 10, height: 10, borderRadius: 999, background: colour }}
      />
    ))}
  </div>
);

const shell: React.CSSProperties = {
  background: 'var(--card-raised)',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 22px 60px rgba(10, 40, 70, 0.16)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '13px 18px',
  borderBottom: '1px solid var(--hairline)',
  fontSize: 14,
};

export type MockVariant = 'create' | 'link' | 'claim';

export function AppMock({ variant }: { variant: MockVariant }) {
  return (
    <div style={shell}>
      {chrome}

      {variant === 'create' && (
        <div style={{ padding: 18 }}>
          <div className="small" style={{ marginBottom: 6 }}>
            Amount
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>25 STRK</div>
          <div style={{ marginTop: 16 }}>
            <div style={rowStyle}>
              <span className="small">Leaves</span>
              <span>your private balance</span>
            </div>
            <div style={rowStyle}>
              <span className="small">Expires</span>
              <span>in 7 days</span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 0 }}>
              <span className="small">Refund to</span>
              <span className="mono">0x049d…4dc7</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              padding: '11px 16px',
              borderRadius: 10,
              background: 'var(--pill)',
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            Lock funds and get a link
          </div>
        </div>
      )}

      {variant === 'link' && (
        <div style={{ padding: 18 }}>
          <div className="small">Send this to anyone</div>
          <div
            className="mono"
            style={{
              marginTop: 10,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--card)',
              color: 'var(--ink-2)',
            }}
          >
            usexenia.vercel.app/c#<span style={{ color: 'var(--accent)' }}>a71f…9c02</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              width: 132,
              margin: '18px auto 6px',
            }}
            aria-hidden
          >
            {Array.from({ length: 49 }, (_, i) => (
              <span
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: 2,
                  background: (i * 7 + (i % 5)) % 3 ? 'var(--ink)' : 'var(--accent-3)',
                }}
              />
            ))}
          </div>
          <p className="small centered" style={{ margin: 0 }}>
            The key is after the <span className="mono">#</span>. It never reaches a server.
          </p>
        </div>
      )}

      {variant === 'claim' && (
        <div style={{ padding: 18 }}>
          <div className="small">You have been sent</div>
          <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em' }}>25 STRK</div>
          <div style={{ marginTop: 16 }}>
            <div style={rowStyle}>
              <span>Register viewing key</span>
              <span className="small" style={{ color: 'var(--accent)' }}>
                same transaction
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 0 }}>
              <span>Credit open note</span>
              <span className="small" style={{ color: 'var(--accent)' }}>
                same transaction
              </span>
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              padding: '11px 16px',
              borderRadius: 10,
              background: 'var(--pill)',
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            Claim
          </div>
        </div>
      )}
    </div>
  );
}
