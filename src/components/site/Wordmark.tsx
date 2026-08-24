/**
 * The Xenia mark: a solid square split by a vertical channel and a horizontal lens, so the negative
 * space reads as an hourglass. Drawn as a mask rather than four paths, which keeps the two gaps
 * exactly aligned at any size.
 *
 * `currentColor` on purpose — the mark inverts to white on the painted panels.
 */
export function Mark({ size = 22, id = 'mark' }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden focusable="false">
      <mask id={id}>
        <rect width="100" height="100" rx="8" fill="#fff" />
        <path d="M-2 50 Q 50 79 102 50 Q 50 21 -2 50" fill="#000" />
        <rect x="46" y="-2" width="8" height="104" fill="#000" />
      </mask>
      <rect width="100" height="100" rx="8" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

export function Wordmark({ id = 'mark', size = 22 }: { id?: string; size?: number }) {
  return (
    <span className="wordmark">
      <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
        <Mark size={size} id={id} />
      </span>
      Xenia
    </span>
  );
}
