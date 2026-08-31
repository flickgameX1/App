import { useState } from 'react';
import { useMeasure } from '../../lib/useMeasure';
import { CHART_PAD, niceMax, type Point } from './scale';

/** Columns: capped thickness, rounded cap, square at the baseline, 2px gaps. */
export default function BarChart({
  data,
  color = 'var(--color-aqua)',
  unit = '',
  height = 148,
}: {
  data: Point[];
  color?: string;
  unit?: string;
  height?: number;
}) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const innerW = Math.max(0, width - CHART_PAD.left - CHART_PAD.right);
  const innerH = height - CHART_PAD.top - CHART_PAD.bottom;
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, Math.max(2, band - 2));
  const baseline = CHART_PAD.top + innerH;
  const y = (v: number) => baseline - (v / max) * innerH;
  const active = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Daily totals over ${data.length} days`}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={CHART_PAD.left}
              x2={CHART_PAD.left + innerW}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
          ))}
          {[0, 1].map((t) => (
            <text
              key={t}
              x={CHART_PAD.left - 6}
              y={y(max * t) + 4}
              textAnchor="end"
              className="fill-[var(--color-ink-3)] text-[10px] tabular-nums"
            >
              {Math.round(max * t)}
            </text>
          ))}

          {data.map((d, i) => {
            const cx = CHART_PAD.left + band * i + band / 2;
            const barH = Math.max(d.value > 0 ? 2 : 0, baseline - y(d.value));
            return (
              <g key={d.date} onPointerEnter={() => setHover(i)}>
                {/* Hit target is the whole band, not the bar — bars get thin. */}
                <rect
                  x={cx - band / 2}
                  y={CHART_PAD.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                />
                <rect
                  x={cx - barW / 2}
                  y={baseline - barH}
                  width={barW}
                  height={barH}
                  rx={Math.min(4, barW / 2)}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                {/* Square off the baseline end that rx just rounded. */}
                {barH > 4 && (
                  <rect x={cx - barW / 2} y={baseline - 4} width={barW} height={4} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                )}
              </g>
            );
          })}

          {data.length > 1 && (
            <>
              <text x={CHART_PAD.left} y={height - 6} className="fill-[var(--color-ink-3)] text-[10px]">
                {data[0].label}
              </text>
              <text
                x={CHART_PAD.left + innerW}
                y={height - 6}
                textAnchor="end"
                className="fill-[var(--color-ink-3)] text-[10px]"
              >
                {data[data.length - 1].label}
              </text>
            </>
          )}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs whitespace-nowrap text-ink"
          style={{
            left: Math.min(
              Math.max(CHART_PAD.left + band * hover! + band / 2 - 40, 0),
              Math.max(width - 90, 0),
            ),
          }}
        >
          <span className="text-ink-3">{active.label} · </span>
          <span className="tabular-nums">
            {active.value}
            {unit}
          </span>
        </div>
      )}
    </div>
  );
}
