/**
 * The painterly panels.
 *
 * The template uses AI-painted landscape bitmaps. These are SVG instead: bands of colour pushed
 * around by `feTurbulence` + `feDisplacementMap`, which is what gives the brushed edge. Two reasons
 * it is worth doing this way — it costs a couple of kilobytes rather than a megabyte per panel, and
 * it recolours from the palette below rather than needing the artwork regenerated.
 *
 * Filter ids are suffixed per instance. SVG filter ids are global, so two panels on one page with
 * the same id would both render through whichever definition parsed last.
 */

type Variant = 'dawn' | 'tide' | 'dusk';

const PALETTE: Record<Variant, { sky: [string, string]; bands: string[] }> = {
  // Hero: deep at the top, opening out to light at the horizon.
  dawn: {
    sky: ['#0b3f66', '#1391e2'],
    bands: ['#0e5b90', '#1391e2', '#4fb0ec', '#8fcdf2', '#cfe9fa'],
  },
  // Mid-page: paler, because UI sits on top of it and has to stay readable.
  tide: {
    sky: ['#7fc4ef', '#e6f3fc'],
    bands: ['#4fb0ec', '#8fcdf2', '#c2e2f8', '#e8f4fd', '#ffffff'],
  },
  // Closing: the darkest, to land the page.
  dusk: {
    sky: ['#062a45', '#0e5b90'],
    bands: ['#0b3f66', '#1391e2', '#3ba3e8', '#7fc4ef', '#b9dcf5'],
  },
};

export function Paint({ variant = 'dawn', id }: { variant?: Variant; id: string }) {
  const { sky, bands } = PALETTE[variant];
  const brush = `brush-${id}`;
  const grain = `grain-${id}`;
  const gradient = `sky-${id}`;

  return (
    <svg viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="100%" stopColor={sky[1]} />
        </linearGradient>

        <filter id={brush} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.009 0.045"
            numOctaves="4"
            seed={variant.length * 7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="78"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="g" />
          <feColorMatrix in="g" type="saturate" values="0" />
        </filter>
      </defs>

      <rect width="1200" height="620" fill={`url(#${gradient})`} />

      <g filter={`url(#${brush})`}>
        {bands.map((colour, i) => (
          <ellipse
            key={colour + i}
            cx={180 + i * 230}
            cy={300 + (i % 2 ? 120 : -70) + i * 34}
            rx={620 - i * 40}
            ry={150 - i * 12}
            fill={colour}
            opacity={0.86 - i * 0.08}
          />
        ))}
        {bands.map((colour, i) => (
          <rect
            key={`b${i}`}
            x={-100}
            y={430 + i * 42}
            width={1400}
            height={70}
            fill={bands[bands.length - 1 - i]}
            opacity={0.7}
          />
        ))}
      </g>

      {/* Canvas tooth. Without it the displacement reads as a gradient smear rather than paint. */}
      <rect width="1200" height="620" filter={`url(#${grain})`} opacity="0.16" />
    </svg>
  );
}
