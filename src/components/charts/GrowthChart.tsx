import { useState } from 'react';
import { useMeasure } from '../../lib/useMeasure';
import type { DayPoint } from '../../lib/stats';

const PAD = { top: 12, right: 12, bottom: 20, left: 34 };
const HEIGHT = 150;

function niceMax(value: number): number {
  const target = Math.max(value, 10);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const step of [1, 1.5, 2, 2.5, 5, 10]) {
    if (step * magnitude >= target) return step * magnitude;
  }
  return 10 * magnitude;
}

function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Total XP over time. One series, so the heading names it and no legend box is
 * needed; only the endpoint is labelled, with the rest available on hover.
 */
export default function GrowthChart({ data }: { data: DayPoint[] }) {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(0, ...data.map((d) => d.cumulative)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.cumulative).toFixed(1)}`).join(' ');
  const area = data.length
    ? `${line} L${x(data.length - 1).toFixed(1)} ${PAD.top + innerH} L${x(0).toFixed(1)} ${PAD.top + innerH} Z`
    : '';
  const last = data[data.length - 1];
  const active = hover !== null ? data[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length < 2 || innerW <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - PAD.left) / innerW;
    setHover(Math.min(data.length - 1, Math.max(0, Math.round(ratio * (data.length - 1)))));
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && data.length > 1 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Total XP over ${data.length} days, now ${last.cumulative}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y"
        >
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="var(--pal-line)"
              strokeWidth="1"
            />
          ))}
          {[0, 1].map((t) => (
            <text
              key={t}
              x={PAD.left - 6}
              y={y(max * t) + 4}
              textAnchor="end"
              className="fill-[var(--pal-dim)] text-[10px] tabular-nums"
            >
              {Math.round(max * t)}
            </text>
          ))}

          <path d={area} fill="var(--pal-reward)" opacity="0.1" />
          <path
            d={line}
            fill="none"
            stroke="var(--pal-reward)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active && (
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--pal-dim)"
              strokeWidth="1"
            />
          )}
          <circle
            cx={x(data.length - 1)}
            cy={y(last.cumulative)}
            r="4"
            fill="var(--pal-reward)"
            stroke="var(--pal-surface)"
            strokeWidth="2"
          />
          {active && (
            <circle
              cx={x(hover!)}
              cy={y(active.cumulative)}
              r="4"
              fill="var(--pal-reward)"
              stroke="var(--pal-surface)"
              strokeWidth="2"
            />
          )}

          <text x={PAD.left} y={HEIGHT - 5} className="fill-[var(--pal-dim)] text-[10px]">
            {shortDate(data[0].date)}
          </text>
          <text
            x={PAD.left + innerW}
            y={HEIGHT - 5}
            textAnchor="end"
            className="fill-[var(--pal-dim)] text-[10px]"
          >
            {shortDate(last.date)}
          </text>
        </svg>
      )}

      {active && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-bg px-2 py-1 text-xs whitespace-nowrap"
          style={{ left: Math.min(Math.max(x(hover!) - 45, 0), Math.max(width - 100, 0)) }}
        >
          <span className="text-dim">{shortDate(active.date)} · </span>
          <span className="tabular-nums">{active.cumulative} XP</span>
          {active.xp > 0 && <span className="text-muted tabular-nums"> (+{active.xp})</span>}
        </div>
      )}
    </div>
  );
}
