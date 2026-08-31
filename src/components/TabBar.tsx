export type Screen = 'now' | 'plan' | 'stats';

const TABS: { key: Screen; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: 'plan', label: 'Plan' },
  { key: 'stats', label: 'Stats' },
];

export default function TabBar({
  screen,
  onChange,
}: {
  screen: Screen;
  onChange: (screen: Screen) => void;
}) {
  return (
    <nav className="sticky bottom-0 border-t border-line bg-bg/95 backdrop-blur pb-safe">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = tab.key === screen;
          return (
            <li key={tab.key} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={active ? 'page' : undefined}
                className={`w-full py-3 text-sm font-medium transition-colors ${
                  active ? 'text-ink' : 'text-ink-3'
                }`}
              >
                <span className="relative inline-block">
                  {tab.label}
                  <span
                    className={`absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                      active ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
