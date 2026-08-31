import { useState } from 'react';
import { useMeasure } from '../../lib/useMeasure';
import { CHART_PAD, niceMax, type Point } from './scale';

/**
 * Single-series trend line. One series means no legend box — the heading names
 * what is plotted — and only the endpoint carries a direct label.
 */
export default function TrendChart({
  data,
  color = 'var(--color-accent)',
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
  const x = (i: number) => CHART_PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => CHART_PAD.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const area = data.length
    ? `${line} L${x(data.length - 1).toFixed(1)} ${(CHART_PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)} ${(
        CHART_PAD.top + innerH
      ).toFixed(1)} Z`
    : '';

  const last = data[data.length - 1];
  const active = hover !== null ? data[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!data.length || innerW <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - CHART_PAD.left) / innerW;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Trend over ${data.length} days, latest ${last?.value ?? 0}${unit}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y"
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

          <path d={area} fill={color} opacity="0.1" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {active && (
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={CHART_PAD.top}
              y2={CHART_PAD.top + innerH}
              stroke="var(--color-ink-3)"
              strokeWidth="1"
            />
          )}

          {last && (
            <circle
              cx={x(data.length - 1)}
              cy={y(last.value)}
              r="4"
              fill={color}
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          )}
          {active && (
            <circle
              cx={x(hover!)}
              cy={y(active.value)}
              r="4"
              fill={color}
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          )}

          {data.length > 1 && (
            <>
              <text
                x={CHART_PAD.left}
                y={height - 6}
                className="fill-[var(--color-ink-3)] text-[10px]"
              >
                {data[0].label}
              </text>
              <text
                x={CHART_PAD.left + innerW}
                y={height - 6}
                textAnchor="end"
                className="fill-[var(--color-ink-3)] text-[10px]"
              >
                {last.label}
              </text>
            </>
          )}
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs whitespace-nowrap text-ink"
          style={{ left: Math.min(Math.max(x(hover!) - 40, 0), Math.max(width - 90, 0)) }}
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
