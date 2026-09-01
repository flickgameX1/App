import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { ensureSeeded } from './db/seed';
import { usePalette } from './lib/usePalette';

type TabId = 'now' | 'plan' | 'stats';

const TABS: { id: TabId; label: string; waitingFor: string }[] = [
  { id: 'now', label: 'Now', waitingFor: 'Task list — stage 1' },
  { id: 'plan', label: 'Plan', waitingFor: 'Calendar — stage 6' },
  { id: 'stats', label: 'Stats', waitingFor: 'Stats — stage 5' },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('now');
  const settings = useLiveQuery(() => db.settings.get(1));

  useEffect(() => {
    void ensureSeeded();
  }, []);

  usePalette(settings?.activePaletteId);

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex flex-1 flex-col px-5 pt-safe">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{active.label}</h1>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-dim">{active.waitingFor}</p>
        </div>
      </main>

      <nav className="border-t border-line pb-safe">
        <ul className="flex">
          {TABS.map((t) => {
            const current = t.id === tab;
            return (
              <li key={t.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={current ? 'page' : undefined}
                  className={`w-full py-3 text-sm font-medium ${current ? 'text-text' : 'text-dim'}`}
                >
                  <span className="relative inline-block">
                    {t.label}
                    <span
                      className={`absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        current ? 'bg-accent' : 'bg-transparent'
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
