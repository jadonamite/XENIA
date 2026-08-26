/**
 * The scattered-square texture that runs through the whole design.
 *
 * Positions are a fixed table rather than `Math.random`, so the server and the client agree and the
 * layout does not reshuffle on hydration.
 */

const TINTS = ['var(--accent)', 'var(--accent-2)', 'var(--accent-3)'] as const;

// x%, y%, size px, tint index
const FIELD: [number, number, number, number][] = [
  [12, 62, 13, 2], [22, 74, 15, 0], [31, 52, 12, 1], [38, 84, 14, 0],
  [44, 66, 16, 0], [52, 79, 11, 2], [58, 55, 14, 1], [66, 71, 15, 0],
  [73, 60, 12, 2], [81, 82, 14, 0], [88, 64, 13, 1], [17, 88, 11, 1],
  [63, 90, 13, 2], [92, 76, 11, 0], [7, 78, 12, 0], [48, 92, 12, 1],
];

export function Scatter({
  count = 10,
  offset = 0,
  className,
  style,
}: {
  count?: number;
  /** Rotates through the table so two scatters on one page do not look identical. */
  offset?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const squares = Array.from({ length: Math.min(count, FIELD.length) }, (_, i) => {
    const [x, y, size, tint] = FIELD[(i + offset) % FIELD.length];
    return { x, y, size, tint, key: `${i}-${offset}` };
  });

  return (
    <div
      aria-hidden
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
    >
      {squares.map((s) => (
        <span
          key={s.key}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: 4,
            background: TINTS[s.tint],
          }}
        />
      ))}
    </div>
  );
}
