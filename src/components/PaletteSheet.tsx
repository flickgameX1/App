import Sheet from './Sheet';
import { PALETTES } from '../lib/palettes';

/**
 * Palettes exist for light-sensitivity as much as for taste, so the light theme
 * is on the same footing as the three dark ones rather than tucked away.
 * Choosing one swaps a single attribute on the root; every colour follows.
 */
export default function PaletteSheet({
  open,
  active,
  onClose,
  onChoose,
}: {
  open: boolean;
  active: string;
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Theme">
      <ul className="space-y-2">
        {PALETTES.map((palette) => {
          const on = palette.id === active;
          return (
            <li key={palette.id}>
              <button
                type="button"
                onClick={() => {
                  onChoose(palette.id);
                  onClose();
                }}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                  on ? 'border-accent' : 'border-line'
                }`}
              >
                {/* A live sample rather than a name alone: the swatches are the
                    palette's own tokens, scoped by the data attribute. */}
                <span
                  data-palette={palette.id}
                  className="flex shrink-0 gap-1 rounded-lg border border-line bg-bg p-2"
                >
                  {['bg-accent', 'bg-reward', 'bg-p1', 'bg-p2', 'bg-p3'].map((token) => (
                    <span key={token} className={`h-4 w-4 rounded-full ${token}`} />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{palette.name}</span>
                  <span className="block text-xs text-dim">
                    {palette.scheme === 'light' ? 'Light' : 'Dark'}
                    {on ? ' · in use' : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
