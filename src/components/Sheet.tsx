import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hide the title visually but keep it for screen readers. */
  quietTitle?: boolean;
  children: ReactNode;
}

/** Bottom sheet. Everything that isn't one of the three screens lives in one. */
export default function Sheet({ open, onClose, title, quietTitle, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const focusable = panel.current?.querySelector<HTMLElement>(
      'input, textarea, button:not([data-no-autofocus])',
    );
    focusable?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        data-no-autofocus
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-5 pt-3 pb-safe"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        {!quietTitle && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
