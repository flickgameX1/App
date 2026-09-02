const WIDTH = 84;
const HEIGHT = 24;
const PAD = 3;

/**
 * A minimised sparkline of recent daily XP — context, not a chart to study, so
 * it carries no axes, grid or labels. Two-pixel line, a wash of the same hue
 * beneath it, and a ringed endpoint so the latest day stays findable.
 */
export default function XpSparkline({ values }: { values: number[] }) {
  // Nothing logged yet: a flat line at the baseline reads as a rule across the
  // card, which is worse than showing nothing.
  if (values.length < 2 || values.every((v) => v === 0)) return null;

  const max = Math.max(1, ...values);
  const x = (i: number) => PAD + (i / (values.length - 1)) * (WIDTH - PAD * 2);
  const y = (v: number) => HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2);

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)} ${HEIGHT - PAD} L${x(0).toFixed(1)} ${HEIGHT - PAD} Z`;
  const last = values[values.length - 1];

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Recent daily XP, latest ${last}`}
      className="shrink-0"
    >
      <path d={area} fill="var(--pal-reward)" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="var(--pal-reward)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        r="2.5"
        fill="var(--pal-reward)"
        stroke="var(--pal-surface)"
        strokeWidth="2"
      />
    </svg>
  );
}
