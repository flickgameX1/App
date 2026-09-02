import type { Priority } from '../db/types';
import { PRIORITY_META } from './meta';
import { WEEKDAY_LABELS, isInMonth, type MonthCursor } from '../lib/calendar';

/**
 * A density map, not a data table. The dots let you read the shape of a week
 * without processing any text — how loaded it is and how urgent — and the
 * agenda below carries the detail once you've picked a day.
 */
export default function CalendarGrid({
  weeks,
  cursor,
  selected,
  today,
  dotsFor,
  onSelect,
}: {
  weeks: string[][];
  cursor: MonthCursor | null;
  selected: string;
  today: string;
  dotsFor: (date: string) => Priority[];
  onSelect: (date: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 px-5 pb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-center text-[10px] text-dim">
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-1 px-5">
        {weeks.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dots = dotsFor(date);
              const outside = cursor !== null && !isInMonth(date, cursor);
              const isToday = date === today;
              const isSelected = date === selected;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelect(date)}
                  aria-label={`${date}, ${dots.length} ${dots.length === 1 ? 'task' : 'tasks'} due`}
                  aria-pressed={isSelected}
                  className={`flex h-11 flex-col items-center justify-center gap-1 rounded-lg border ${
                    isSelected ? 'border-accent bg-surface' : 'border-transparent'
                  }`}
                >
                  <span
                    className={`text-xs tabular-nums ${
                      isToday ? 'font-semibold text-accent' : outside ? 'text-dim/60' : 'text-muted'
                    }`}
                  >
                    {Number(date.slice(-2))}
                  </span>
                  <span className="flex h-1.5 items-center gap-[3px]">
                    {dots.slice(0, 3).map((priority, i) => (
                      <span
                        key={i}
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[priority].dot}`}
                      />
                    ))}
                    {dots.length > 3 && <span className="text-[9px] text-dim">+</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
