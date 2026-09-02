import type { ReactNode } from 'react';

/** Neutral detail, read after the eye has landed on a row. Never coloured. */
export default function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">{children}</span>
  );
}
