/**
 * One segment per planned sprint, filled as they're completed. A count of what
 * is done and what is left — never a count of what you are behind by.
 */
export default function SprintProgress({ done, planned }: { done: number; planned: number }) {
  const filled = Math.min(done, planned);
  const left = Math.max(0, planned - filled);

  return (
    <div>
      <div
        className="flex gap-[2px]"
        role="img"
        aria-label={`${filled} of ${planned} sprints done`}
      >
        {Array.from({ length: planned }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < filled ? 'bg-accent' : 'bg-line'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {filled} of {planned} {planned === 1 ? 'sprint' : 'sprints'} done
        {left > 0 && <span className="text-dim"> · {left} left</span>}
      </p>
    </div>
  );
}
