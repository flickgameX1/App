import type { ReactNode } from 'react';

export interface RailTab {
  id: string;
  label: string;
  icon: ReactNode;
}

/**
 * The wide-screen replacement for the bottom tab bar. A thumb reaches the bottom
 * of a phone; on an iPad or a laptop that same bar is a long way from anything
 * you are looking at, so navigation moves to the side.
 */
export default function SideRail({
  tabs,
  active,
  onChange,
  onOpenSettings,
}: {
  tabs: RailTab[];
  active: string;
  onChange: (id: string) => void;
  onOpenSettings: () => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex w-56 shrink-0 flex-col border-r border-line px-3 py-5"
    >
      <p className="mb-6 px-3 font-display text-xl font-semibold tracking-tight">Sprint</p>

      <ul className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                  on ? 'bg-surface text-text' : 'text-muted hover:bg-surface/60'
                }`}
              >
                <span aria-hidden="true" className={on ? 'text-accent' : 'text-dim'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-surface/60"
      >
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent" />
        Settings
      </button>
    </nav>
  );
}

/** Small line icons, drawn rather than imported so they inherit the palette. */
export const RAIL_ICONS = {
  now: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="7" />
      <path d="M9 5v4l2.5 2" strokeLinecap="round" />
    </svg>
  ),
  plan: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="3.5" width="13" height="12" rx="2.5" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3" strokeLinecap="round" />
    </svg>
  ),
  stats: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12.5l3.5-4 3 2.5L15 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
