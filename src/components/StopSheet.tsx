import Sheet from './Sheet';

/**
 * Leaving mid-sprint is a normal thing to do, so there is no "abandon", no "give
 * up" and no warning tone here — just the two honest answers, both of which keep
 * the time already spent.
 */
export default function StopSheet({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (choice: 'paused' | 'stopped') => void;
}) {
  const options = [
    { choice: 'paused' as const, label: 'Resume later', hint: 'Stays on the task, right where you left it.' },
    { choice: 'stopped' as const, label: 'Done for now', hint: 'Nothing lost — the time you did still counts.' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Stopping here?">
      <ul className="space-y-2">
        {options.map((o) => (
          <li key={o.choice}>
            <button
              type="button"
              onClick={() => onChoose(o.choice)}
              className="w-full rounded-xl border border-line bg-bg p-4 text-left"
            >
              <span className="block text-base font-medium">{o.label}</span>
              <span className="mt-0.5 block text-sm text-dim">{o.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="mt-4 w-full py-3 text-sm text-dim">
        Keep going
      </button>
    </Sheet>
  );
}
