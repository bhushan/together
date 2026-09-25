import { motifFor, type Motif } from '@/lib/motif';

const W = 160;
const H = 50;

/** A smooth ridge line: cubic segments with horizontal tangents at each point. */
function ridgePath(points: number[]) {
  const step = W / (points.length - 1);
  const coords = points.map((point, index) => [index * step, point * H] as const);
  let path = `M ${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)}`;
  for (let index = 1; index < coords.length; index += 1) {
    const [x0, y0] = coords[index - 1];
    const [x1, y1] = coords[index];
    const bend = (x1 - x0) / 2;
    path += ` C ${(x0 + bend).toFixed(2)} ${y0.toFixed(2)} ${(x1 - bend).toFixed(2)} ${y1.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return `${path} L ${W} ${H} L 0 ${H} Z`;
}

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);

/** Blend two hex colours. Used for haze, so it is computed rather than left to CSS. */
function mix(from: string, to: string, amount: number) {
  const blend = (at: number) => Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * amount);
  return `#${[1, 3, 5].map(at => blend(at).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A destination drawn from its own name. Same place, same horizon, every time.
 * Distance is carried by haze rather than opacity: far ridges are mixed towards
 * the colour of the sky at the waterline, near ridges stay close to black, so
 * the layers separate instead of muddying into one another.
 *
 * Gradient ids are derived from the seed rather than generated per render so
 * this stays a server component and two cards for one city cannot collide.
 */
export function Horizon({ seed, motif = motifFor(seed) }: { seed: string; motif?: Motif }) {
  const key = `h${seed.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'x'}`;
  const { scheme, horizon, sun, ridges } = motif;
  const waterTop = horizon * H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="presentation" focusable="false">
      <defs>
        <linearGradient id={`${key}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scheme.skyTop} />
          <stop offset={`${horizon * 100}%`} stopColor={scheme.skyLow} />
        </linearGradient>
        <radialGradient id={`${key}-glow`}>
          <stop offset="0%" stopColor={scheme.sun} stopOpacity="0.85" />
          <stop offset="100%" stopColor={scheme.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${key}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mix(scheme.ridge, scheme.skyLow, 0.55)} />
          <stop offset="100%" stopColor={scheme.ridge} />
        </linearGradient>
        {/* Keeps the city name legible whatever the seed produced underneath. */}
        <linearGradient id={`${key}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c1e22" stopOpacity="0" />
          <stop offset="100%" stopColor="#0c1e22" stopOpacity="0.72" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${key}-sky)`} />
      <circle cx={sun.x * W} cy={sun.y * H} r={sun.r * H * 4} fill={`url(#${key}-glow)`} />
      <circle cx={sun.x * W} cy={sun.y * H} r={sun.r * H} fill={scheme.sun} />

      {ridges.map(ridge => (
        <path
          key={ridge.depth}
          d={ridgePath(ridge.points)}
          fill={mix(scheme.ridge, scheme.skyLow, (1 - ridge.depth) * 0.72)}
        />
      ))}

      <rect y={waterTop} width={W} height={H - waterTop} fill={`url(#${key}-water)`} />
      <rect y={waterTop - 0.2} width={W} height="0.45" fill={scheme.sun} opacity="0.55" />

      {/* The sun's reflection, as broken lines of light rather than one column:
          a solid bar reads as a seam in the artwork instead of as water. */}
      {Array.from({ length: 5 }, (_, step) => {
        const y = waterTop + (H - waterTop) * ((step + 0.6) / 5.4);
        const spread = sun.r * H * (1.5 + step * 1.1);
        return (
          <rect
            key={step}
            x={sun.x * W - spread / 2}
            y={y}
            width={spread}
            height={0.28}
            rx={0.17}
            fill={scheme.sun}
            opacity={0.3 - step * 0.05}
          />
        );
      })}
      <rect y={H * 0.45} width={W} height={H * 0.55} fill={`url(#${key}-scrim)`} />
    </svg>
  );
}
